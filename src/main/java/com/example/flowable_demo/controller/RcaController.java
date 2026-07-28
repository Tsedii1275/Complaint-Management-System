package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.*;
import com.example.flowable_demo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/rca")
public class RcaController {

    @Autowired
    private RcaCaseRepository rcaCaseRepository;

    @Autowired
    private Rca5WhysRepository rca5WhysRepository;

    @Autowired
    private CapaActionRepository capaActionRepository;

    @Autowired
    private RcaAuditLogRepository rcaAuditLogRepository;

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetails) {
            return ((UserDetails) auth.getPrincipal()).getUsername();
        }
        return auth != null ? auth.getName() : "system";
    }

    private void logAudit(Long rcaCaseId, String ticketId, String action, String description) {
        RcaAuditLog log = RcaAuditLog.builder()
                .rcaCaseId(rcaCaseId)
                .ticketId(ticketId)
                .action(action)
                .actor(getCurrentUsername())
                .description(description)
                .build();
        rcaAuditLogRepository.save(log);
    }

    @PostMapping("/trigger")
    @Transactional
    public ResponseEntity<?> triggerRca(@RequestBody Map<String, Object> payload) {
        String ticketId = (String) payload.get("ticketId");
        String processInstanceId = (String) payload.get("processInstanceId");
        Boolean rcaRequired = (Boolean) payload.get("rcaRequired");

        if (ticketId == null || ticketId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ticketId is required"));
        }

        if (Boolean.TRUE.equals(rcaRequired)) {
            // Check if RCA case already exists
            Optional<RcaCase> existing = rcaCaseRepository.findByTicketId(ticketId);
            if (existing.isPresent()) {
                return ResponseEntity.ok(Map.of("message", "RCA Case already exists", "rcaCase", existing.get()));
            }

            RcaCase newCase = RcaCase.builder()
                    .ticketId(ticketId)
                    .processInstanceId(processInstanceId)
                    .rcaStatus("PENDING")
                    .rcaRequired(true)
                    .incidentDate(LocalDateTime.now())
                    .build();

            RcaCase savedCase = rcaCaseRepository.save(newCase);

            // Initialize empty 5 whys structure
            Rca5Whys whys = Rca5Whys.builder()
                    .rcaCase(savedCase)
                    .build();
            rca5WhysRepository.save(whys);
            savedCase.setWhys(whys);

            logAudit(savedCase.getId(), ticketId, "RCA_TRIGGERED", "Root Cause Analysis triggered by " + getCurrentUsername());

            return ResponseEntity.status(HttpStatus.CREATED).body(savedCase);
        } else {
            Optional<RcaCase> existing = rcaCaseRepository.findByTicketId(ticketId);
            if (existing.isPresent()) {
                return ResponseEntity.ok(Map.of("message", "RCA Case already exists", "rcaCase", existing.get()));
            }
            RcaCase newCase = RcaCase.builder()
                    .ticketId(ticketId)
                    .processInstanceId(processInstanceId)
                    .rcaStatus("NOT_REQUIRED")
                    .rcaRequired(false)
                    .incidentDate(LocalDateTime.now())
                    .build();
            RcaCase savedCase = rcaCaseRepository.save(newCase);
            logAudit(savedCase.getId(), ticketId, "RCA_DECLINED", "RCA marked as not required by " + getCurrentUsername());
            return ResponseEntity.ok(Map.of("message", "RCA not requested for ticket " + ticketId, "rcaCase", savedCase));
        }
    }

    @GetMapping("/cases")
    public ResponseEntity<List<RcaCase>> getAllCases() {
        return ResponseEntity.ok(rcaCaseRepository.findAll());
    }

    @GetMapping("/cases/{id}")
    public ResponseEntity<?> getCaseById(@PathVariable Long id) {
        return rcaCaseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/cases/{id}")
    @Transactional
    public ResponseEntity<?> updateCase(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<RcaCase> opt = rcaCaseRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        RcaCase rcaCase = opt.get();
        String oldStatus = rcaCase.getRcaStatus();

        if (payload.containsKey("rootCauseCategory")) {
            rcaCase.setRootCauseCategory((String) payload.get("rootCauseCategory"));
        }
        if (payload.containsKey("financialImpact")) {
            Object fi = payload.get("financialImpact");
            if (fi != null) {
                rcaCase.setFinancialImpact(new BigDecimal(fi.toString()));
            }
        }
        if (payload.containsKey("reputationalRisk")) {
            rcaCase.setReputationalRisk((String) payload.get("reputationalRisk"));
        }
        if (payload.containsKey("complianceImpact")) {
            rcaCase.setComplianceImpact((String) payload.get("complianceImpact"));
        }
        if (payload.containsKey("operationalDisruption")) {
            rcaCase.setOperationalDisruption((String) payload.get("operationalDisruption"));
        }
        if (payload.containsKey("preventiveStrategy")) {
            rcaCase.setPreventiveStrategy((String) payload.get("preventiveStrategy"));
        }
        if (payload.containsKey("rcaStatus")) {
            rcaCase.setRcaStatus((String) payload.get("rcaStatus"));
        }
        if (payload.containsKey("rcaRequired")) {
            rcaCase.setRcaRequired((Boolean) payload.get("rcaRequired"));
        }
        if (payload.containsKey("rcaSummary")) {
            rcaCase.setRcaSummary((String) payload.get("rcaSummary"));
        }
        if (payload.containsKey("rcaOwner")) {
            rcaCase.setRcaOwner((String) payload.get("rcaOwner"));
        }
        if (payload.containsKey("rcaCompletionDate")) {
            Object rcd = payload.get("rcaCompletionDate");
            if (rcd != null) {
                rcaCase.setRcaCompletionDate(LocalDateTime.parse(rcd.toString()));
            }
        }

        // Calculate risk score: financial impact / 1000 + reputational threat level
        double riskVal = 0.0;
        if (rcaCase.getFinancialImpact() != null) {
            riskVal += rcaCase.getFinancialImpact().doubleValue() / 1000.0;
        }
        if ("MEDIUM".equalsIgnoreCase(rcaCase.getReputationalRisk())) {
            riskVal += 5;
        } else if ("HIGH".equalsIgnoreCase(rcaCase.getReputationalRisk())) {
            riskVal += 10;
        } else if ("CRITICAL".equalsIgnoreCase(rcaCase.getReputationalRisk())) {
            riskVal += 20;
        }
        rcaCase.setRiskScore(riskVal);

        if ("PENDING".equals(oldStatus) && !"PENDING".equals(rcaCase.getRcaStatus())) {
            rcaCase.setAnalysisDate(LocalDateTime.now());
        }
        if (!"COMPLETED".equals(oldStatus) && "COMPLETED".equals(rcaCase.getRcaStatus())) {
            rcaCase.setRcaCompletionDate(LocalDateTime.now());
        }

        RcaCase saved = rcaCaseRepository.save(rcaCase);
        logAudit(id, saved.getTicketId(), "RCA_UPDATED", "RCA details updated. Status: " + saved.getRcaStatus());

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/cases/{id}/whys")
    @Transactional
    public ResponseEntity<?> updateWhys(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Optional<RcaCase> opt = rcaCaseRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        RcaCase rcaCase = opt.get();
        Rca5Whys whys = rcaCase.getWhys();
        if (whys == null) {
            whys = new Rca5Whys();
            whys.setRcaCase(rcaCase);
        }

        whys.setWhy1(payload.get("why1"));
        whys.setWhy2(payload.get("why2"));
        whys.setWhy3(payload.get("why3"));
        whys.setWhy4(payload.get("why4"));
        whys.setWhy5(payload.get("why5"));
        whys.setRootCauseStatement(payload.get("rootCauseStatement"));

        Rca5Whys savedWhys = rca5WhysRepository.save(whys);
        rcaCase.setWhys(savedWhys);
        rcaCaseRepository.save(rcaCase);

        logAudit(id, rcaCase.getTicketId(), "WHYS_UPDATED", "5 Whys model updated.");
        return ResponseEntity.ok(savedWhys);
    }

    @PostMapping("/cases/{id}/capa")
    @Transactional
    public ResponseEntity<?> addCapaAction(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<RcaCase> opt = rcaCaseRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        RcaCase rcaCase = opt.get();
        CapaAction action = CapaAction.builder()
                .rcaCase(rcaCase)
                .actionType((String) payload.get("actionType"))
                .actionDescription((String) payload.get("actionDescription"))
                .owner((String) payload.get("owner"))
                .targetDate(payload.get("targetDate") != null ? LocalDate.parse((String) payload.get("targetDate")) : null)
                .implementationStatus("PENDING")
                .build();

        CapaAction saved = capaActionRepository.save(action);
        logAudit(id, rcaCase.getTicketId(), "CAPA_ADDED", "New CAPA action added. Action ID: " + saved.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/capa/{actionId}")
    @Transactional
    public ResponseEntity<?> updateCapaAction(@PathVariable Long actionId, @RequestBody Map<String, Object> payload) {
        Optional<CapaAction> opt = capaActionRepository.findById(actionId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CapaAction action = opt.get();
        if (payload.containsKey("implementationStatus")) {
            action.setImplementationStatus((String) payload.get("implementationStatus"));
        }
        if (payload.containsKey("owner")) {
            action.setOwner((String) payload.get("owner"));
        }
        if (payload.containsKey("targetDate")) {
            action.setTargetDate(payload.get("targetDate") != null ? LocalDate.parse((String) payload.get("targetDate")) : null);
        }
        if (payload.containsKey("effectivenessRating")) {
            action.setEffectivenessRating((String) payload.get("effectivenessRating"));
        }
        if (payload.containsKey("verificationNotes")) {
            action.setVerificationNotes((String) payload.get("verificationNotes"));
        }

        CapaAction saved = capaActionRepository.save(action);
        logAudit(action.getRcaCase().getId(), action.getRcaCase().getTicketId(), "CAPA_UPDATED", "CAPA action updated. Status: " + saved.getImplementationStatus());

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/capa/{actionId}")
    @Transactional
    public ResponseEntity<?> deleteCapaAction(@PathVariable Long actionId) {
        Optional<CapaAction> opt = capaActionRepository.findById(actionId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CapaAction action = opt.get();
        Long rcaCaseId = action.getRcaCase().getId();
        String ticketId = action.getRcaCase().getTicketId();

        capaActionRepository.delete(action);
        logAudit(rcaCaseId, ticketId, "CAPA_DELETED", "CAPA action deleted. Action ID: " + actionId);

        return ResponseEntity.ok(Map.of("message", "CAPA action deleted"));
    }

    @GetMapping("/cases/{id}/audit-logs")
    public ResponseEntity<List<RcaAuditLog>> getAuditLogs(@PathVariable Long id) {
        return ResponseEntity.ok(rcaAuditLogRepository.findByRcaCaseId(id));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        List<RcaCase> cases = rcaCaseRepository.findAll();
        List<CapaAction> capaActions = capaActionRepository.findAll();

        long total = cases.size();
        long completed = cases.stream().filter(c -> "COMPLETED".equalsIgnoreCase(c.getRcaStatus())).count();
        long inProgress = cases.stream().filter(c -> "IN_PROGRESS".equalsIgnoreCase(c.getRcaStatus())).count();
        long pending = cases.stream().filter(c -> "PENDING".equalsIgnoreCase(c.getRcaStatus())).count();

        BigDecimal totalFinancialImpact = cases.stream()
                .map(RcaCase::getFinancialImpact)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> categoryBreakdown = cases.stream()
                .map(RcaCase::getRootCauseCategory)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        Map<String, Long> riskBreakdown = cases.stream()
                .map(RcaCase::getReputationalRisk)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        Map<String, Long> capaStatusBreakdown = capaActions.stream()
                .map(CapaAction::getImplementationStatus)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));

        Map<String, Object> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("completed", completed);
        stats.put("inProgress", inProgress);
        stats.put("pending", pending);
        stats.put("totalFinancialImpact", totalFinancialImpact);
        stats.put("categoryBreakdown", categoryBreakdown);
        stats.put("riskBreakdown", riskBreakdown);
        stats.put("capaStatusBreakdown", capaStatusBreakdown);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/cases/export/excel")
    public ResponseEntity<byte[]> exportExcel() {
        List<RcaCase> cases = rcaCaseRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append("id,Ticket ID,Process Instance ID,Root Cause Category,Incident Date,RCA Status,Financial Impact,Reputational Risk,Risk Score,Created At\n");
        for (RcaCase c : cases) {
            csv.append(c.getId()).append(",")
                    .append(c.getTicketId()).append(",")
                    .append(c.getProcessInstanceId() != null ? c.getProcessInstanceId() : "").append(",")
                    .append(c.getRootCauseCategory() != null ? c.getRootCauseCategory() : "").append(",")
                    .append(c.getIncidentDate() != null ? c.getIncidentDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "").append(",")
                    .append(c.getRcaStatus()).append(",")
                    .append(c.getFinancialImpact() != null ? c.getFinancialImpact() : BigDecimal.ZERO).append(",")
                    .append(c.getReputationalRisk() != null ? c.getReputationalRisk() : "").append(",")
                    .append(c.getRiskScore() != null ? c.getRiskScore() : 0.0).append(",")
                    .append(c.getCreatedAt() != null ? c.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : "").append("\n");
        }

        byte[] outputBytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDispositionFormData("attachment", "rca_cases_export.csv");

        return new ResponseEntity<>(outputBytes, headers, HttpStatus.OK);
    }

    @GetMapping("/cases/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {
        // Return structured text representing the PDF layout
        List<RcaCase> cases = rcaCaseRepository.findAll();
        StringBuilder pdf = new StringBuilder();
        pdf.append("============================================================\n");
        pdf.append("            ROOT CAUSE ANALYSIS (RCA) CASES REPORT          \n");
        pdf.append("============================================================\n\n");
        pdf.append(String.format("Generated: %s\n\n", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))));
        
        for (RcaCase c : cases) {
            pdf.append("------------------------------------------------------------\n");
            pdf.append("Ticket ID:       ").append(c.getTicketId()).append("\n");
            pdf.append("Status:          ").append(c.getRcaStatus()).append("\n");
            pdf.append("Category:        ").append(c.getRootCauseCategory() != null ? c.getRootCauseCategory() : "N/A").append("\n");
            pdf.append("Financial Loss:  ETB ").append(c.getFinancialImpact() != null ? c.getFinancialImpact() : "0.00").append("\n");
            pdf.append("Reputational:    ").append(c.getReputationalRisk()).append("\n");
            pdf.append("Risk Score:      ").append(c.getRiskScore()).append("\n");
            pdf.append("Strategy:        ").append(c.getPreventiveStrategy() != null ? c.getPreventiveStrategy() : "N/A").append("\n");
            pdf.append("------------------------------------------------------------\n\n");
        }

        byte[] outputBytes = pdf.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDispositionFormData("attachment", "rca_cases_report.txt");

        return new ResponseEntity<>(outputBytes, headers, HttpStatus.OK);
    }
}
