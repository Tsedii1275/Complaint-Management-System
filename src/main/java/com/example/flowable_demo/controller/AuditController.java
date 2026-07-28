package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.AuditLog;
import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.model.TaskTimeTracking;
import com.example.flowable_demo.repository.ComplaintSlaMetricsRepository;
import com.example.flowable_demo.service.AuditService;
import com.example.flowable_demo.service.SlaTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    @Autowired
    private AuditService auditService;

    @Autowired
    private SlaTrackingService slaTrackingService;

    @Autowired
    private ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired
    private com.example.flowable_demo.repository.UserRepository userRepository;

    private String getCurrentUserRole() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().iterator().next().getAuthority();
        }
        return "ROLE_ANONYMOUS";
    }

    private String getCurrentUsername() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getName();
        }
        return "anonymous";
    }

    private List<ComplaintSlaMetrics> filterByRoleOwnership(List<ComplaintSlaMetrics> metrics) {
        String role = getCurrentUserRole();
        if ("ROLE_ADMIN".equals(role) || "ROLE_CMD_OFFICER".equals(role) || "ROLE_SERVICE_QUALITY".equals(role) || "ROLE_CHIEF_COMMITTEE".equals(role)) {
            return metrics;
        }
        
        String username = getCurrentUsername();
        var userOpt = userRepository.findByUsernameIgnoreCase(username);
        if (userOpt.isPresent()) {
            com.example.flowable_demo.model.User user = userOpt.get();
            String branch = user.getBranch();
            String department = user.getDepartment();
            
            if ("ROLE_BRANCH_STAFF".equals(role) && branch != null && !branch.isBlank()) {
                return metrics.stream()
                        .filter(m -> m.getBranch() == null || branch.equalsIgnoreCase(m.getBranch()))
                        .collect(Collectors.toList());
            } else if ("ROLE_DEPARTMENT_WORKUNIT".equals(role)) {
                return metrics.stream()
                        .filter(m -> {
                            boolean matchBranch = branch == null || branch.isBlank() || branch.equalsIgnoreCase(m.getBranch());
                            boolean matchDept = department == null || department.isBlank() || department.equalsIgnoreCase(m.getDepartment());
                            return matchBranch && matchDept;
                        })
                        .collect(Collectors.toList());
            }
        }
        return metrics;
    }

    @GetMapping("/logs")
    public List<AuditLog> getLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String complaintId,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return auditService.getLogs(action, complaintId, actor, startDate, endDate);
    }

    // ─── SLA Metrics Endpoints ───

    @GetMapping("/sla/all")
    public ResponseEntity<List<ComplaintSlaMetrics>> getAllSlaMetrics() {
        List<ComplaintSlaMetrics> metrics = slaTrackingService.getAllMetrics();
        return ResponseEntity.ok(filterByRoleOwnership(metrics));
    }

    @GetMapping("/sla/process/{processInstanceId}")
    public ResponseEntity<Map<String, Object>> getSlaByProcessInstance(@PathVariable String processInstanceId) {
        return ResponseEntity.ok(slaTrackingService.buildSlaReport(processInstanceId));
    }

    @GetMapping("/sla/complaint/{complaintId}")
    public ResponseEntity<Map<String, Object>> getSlaByComplaintId(@PathVariable String complaintId) {
        var metrics = slaTrackingService.getMetricsByComplaintId(complaintId);
        if (metrics.isEmpty()) {
            return ResponseEntity.ok(Map.of("available", false));
        }
        return ResponseEntity.ok(slaTrackingService.buildSlaReport(metrics.get().getProcessInstanceId()));
    }

    @GetMapping("/sla/tasks/{processInstanceId}")
    public ResponseEntity<List<TaskTimeTracking>> getTaskTracking(@PathVariable String processInstanceId) {
        return ResponseEntity.ok(slaTrackingService.getTaskTrackingByProcessInstanceId(processInstanceId));
    }

    // ─── Advanced Analytics & Reporting Module Endpoints ───

    private org.springframework.data.jpa.domain.Specification<ComplaintSlaMetrics> getFilterSpec(
            String category, String branch, String district, String channel,
            String status, String slaStatus, Boolean fcrStatus,
            LocalDateTime startDate, LocalDateTime endDate) {
        return (root, query, cb) -> {
            var p = cb.conjunction();
            if (category != null && !category.isBlank()) {
                p = cb.and(p, cb.equal(root.get("complaintCategory"), category));
            }
            if (branch != null && !branch.isBlank()) {
                p = cb.and(p, cb.equal(root.get("branch"), branch));
            }
            if (district != null && !district.isBlank()) {
                p = cb.and(p, cb.equal(root.get("district"), district));
            }
            if (channel != null && !channel.isBlank()) {
                p = cb.and(p, cb.equal(root.get("channel"), channel));
            }
            if (status != null && !status.isBlank()) {
                p = cb.and(p, cb.equal(root.get("status"), status));
            }
            if (slaStatus != null && !slaStatus.isBlank()) {
                p = cb.and(p, cb.equal(root.get("slaStatus"), slaStatus));
            }
            if (fcrStatus != null) {
                p = cb.and(p, cb.equal(root.get("fcrStatus"), fcrStatus));
            }
            if (startDate != null) {
                p = cb.and(p, cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                p = cb.and(p, cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }
            return p;
        };
    }

    @GetMapping("/analytics/stats")
    public ResponseEntity<?> getStats(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String slaStatus,
            @RequestParam(required = false) Boolean fcrStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        slaTrackingService.getAllMetrics(); // Trigger self-healing
        var spec = getFilterSpec(category, branch, district, channel, status, slaStatus, fcrStatus, startDate, endDate);
        List<ComplaintSlaMetrics> filtered = filterByRoleOwnership(slaMetricsRepository.findAll(spec));

        long totalCount = filtered.size();
        long closedCount = filtered.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus())).count();
        long fcrCount = filtered.stream().filter(m -> Boolean.TRUE.equals(m.getFcrStatus())).count();
        long slaCompliantCount = filtered.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus()) && !Boolean.TRUE.equals(m.getBreached())).count();
        long overdueCount = filtered.stream().filter(m -> Boolean.TRUE.equals(m.getBreached()) || "OVERDUE".equalsIgnoreCase(m.getSlaStatus())).count();

        double totalDurationMinutes = 0;
        int durationCount = 0;
        for (var m : filtered) {
            if ("CLOSED".equalsIgnoreCase(m.getStatus()) && m.getResolvedAt() != null) {
                long diff = java.time.Duration.between(m.getCreatedAt(), m.getResolvedAt()).toMinutes();
                totalDurationMinutes += diff;
                durationCount++;
            }
        }
        double avgResolutionTime = durationCount > 0 ? totalDurationMinutes / durationCount : 0.0;
        double fcrRate = closedCount > 0 ? (fcrCount * 100.0) / closedCount : 0.0;
        double slaComplianceRate = closedCount > 0 ? (slaCompliantCount * 100.0) / closedCount : 100.0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCount", totalCount);
        stats.put("closedCount", closedCount);
        stats.put("fcrCount", fcrCount);
        stats.put("avgResolutionTime", avgResolutionTime);
        stats.put("fcrRate", fcrRate);
        stats.put("slaComplianceRate", slaComplianceRate);
        stats.put("overdueCount", overdueCount);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/analytics/trend")
    public ResponseEntity<?> getTrend(
            @RequestParam(required = false) String interval,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String slaStatus,
            @RequestParam(required = false) Boolean fcrStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        slaTrackingService.getAllMetrics();
        var spec = getFilterSpec(category, branch, district, channel, status, slaStatus, fcrStatus, startDate, endDate);
        List<ComplaintSlaMetrics> filtered = filterByRoleOwnership(slaMetricsRepository.findAll(spec));

        String formatStr = "yyyy-MM-dd";
        if ("weekly".equalsIgnoreCase(interval)) {
            formatStr = "yyyy-'W'ww";
        } else if ("monthly".equalsIgnoreCase(interval)) {
            formatStr = "yyyy-MM";
        } else if ("yearly".equalsIgnoreCase(interval)) {
            formatStr = "yyyy";
        }

        final String activeFormat = formatStr;
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern(activeFormat);

        Map<String, Long> grouped = filtered.stream()
                .collect(Collectors.groupingBy(m -> m.getCreatedAt().format(formatter), Collectors.counting()));

        List<Map<String, Object>> trend = grouped.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("period", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .sorted(Comparator.comparing(m -> m.get("period").toString()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(trend);
    }

    @GetMapping("/analytics/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String slaStatus,
            @RequestParam(required = false) Boolean fcrStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        slaTrackingService.getAllMetrics();
        var spec = getFilterSpec(category, branch, district, channel, status, slaStatus, fcrStatus, startDate, endDate);
        List<ComplaintSlaMetrics> filtered = filterByRoleOwnership(slaMetricsRepository.findAll(spec));
        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/analytics/export")
    public ResponseEntity<?> exportReports(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String slaStatus,
            @RequestParam(required = false) Boolean fcrStatus,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        slaTrackingService.getAllMetrics();
        var spec = getFilterSpec(category, branch, district, channel, status, slaStatus, fcrStatus, startDate, endDate);
        List<ComplaintSlaMetrics> filtered = filterByRoleOwnership(slaMetricsRepository.findAll(spec));

        StringBuilder sb = new StringBuilder();
        sb.append("Ticket ID,Customer Name,Category,Branch,District,Channel,Status,SLA Status,Resolution Time (min),FCR Status,Created At,Resolved At\n");

        for (var m : filtered) {
            long duration = 0;
            if (m.getResolvedAt() != null) {
                duration = java.time.Duration.between(m.getCreatedAt(), m.getResolvedAt()).toMinutes();
            }
            sb.append(String.format("%s,\"%s\",%s,%s,%s,%s,%s,%s,%d,%s,%s,%s\n",
                    m.getComplaintId(),
                    m.getCustomerName() != null ? m.getCustomerName().replace("\"", "\"\"") : "",
                    m.getComplaintCategory(),
                    m.getBranch(),
                    m.getDistrict(),
                    m.getChannel(),
                    m.getStatus(),
                    m.getSlaStatus(),
                    duration,
                    Boolean.TRUE.equals(m.getFcrStatus()) ? "FCR" : "Standard Escalation",
                    m.getCreatedAt(),
                    m.getResolvedAt() != null ? m.getResolvedAt().toString() : ""
            ));
        }

        byte[] data = sb.toString().getBytes(StandardCharsets.UTF_8);
        String filename = "csv".equalsIgnoreCase(format) ? "complaint_report.csv" : "complaint_report.xls";
        String contentType = "csv".equalsIgnoreCase(format) ? "text/csv" : "application/vnd.ms-excel";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .contentLength(data.length)
                .body(data);
    }
}
