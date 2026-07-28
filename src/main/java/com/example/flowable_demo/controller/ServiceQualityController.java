package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.service.SlaTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping("/api/service-quality")
public class ServiceQualityController {

    @Autowired
    private SlaTrackingService slaTrackingService;

    /**
     * Dedicated Service Quality Bank-wide SLA Monitoring Overview
     */
    @GetMapping("/monitoring/summary")
    public ResponseEntity<Map<String, Object>> getServiceQualityMonitoringSummary() {
        List<ComplaintSlaMetrics> all = slaTrackingService.getAllMetrics();

        long total = all.size();
        long open = all.stream().filter(m -> !"CLOSED".equalsIgnoreCase(m.getStatus())).count();
        long closed = all.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus())).count();

        long resolvedWithinSla = all.stream().filter(m -> "RESOLVED_WITHIN_SLA".equalsIgnoreCase(m.getSlaStatus())
                || ("CLOSED".equalsIgnoreCase(m.getStatus()) && !Boolean.TRUE.equals(m.getBreached()))).count();
        long resolvedAfterSla = all.stream().filter(m -> "RESOLVED_AFTER_SLA".equalsIgnoreCase(m.getSlaStatus())
                || ("CLOSED".equalsIgnoreCase(m.getStatus()) && Boolean.TRUE.equals(m.getBreached()))).count();

        long breached = all.stream().filter(m -> Boolean.TRUE.equals(m.getBreached())
                || "BREACHED".equalsIgnoreCase(m.getSlaStatus()) || "OVERDUE".equalsIgnoreCase(m.getSlaStatus()))
                .count();
        long escalated = all.stream().filter(m -> "ESCALATED".equalsIgnoreCase(m.getSlaStatus())
                || (m.getEscalationLevel() != null && m.getEscalationLevel() > 0)).count();

        double complianceRate = closed > 0
                ? Math.round(((double) resolvedWithinSla / (double) closed) * 100.0 * 10.0) / 10.0
                : 100.0;

        double avgResolutionMinutes = all.stream()
                .filter(m -> m.getResolvedAt() != null)
                .mapToLong(m -> m.getTotalElapsedMinutes() != null ? m.getTotalElapsedMinutes() : 0)
                .average()
                .orElse(0.0);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalComplaints", total);
        summary.put("openComplaints", open);
        summary.put("closedComplaints", closed);
        summary.put("resolvedWithinSla", resolvedWithinSla);
        summary.put("resolvedAfterSla", resolvedAfterSla);
        summary.put("slaBreaches", breached);
        summary.put("escalatedComplaints", escalated);
        summary.put("slaComplianceRate", complianceRate);
        summary.put("avgResolutionMinutes", Math.round(avgResolutionMinutes));

        return ResponseEntity.ok(summary);
    }

    /**
     * Departmental SLA Performance Breakdown
     */
    @GetMapping("/monitoring/departments")
    public ResponseEntity<List<Map<String, Object>>> getDepartmentSlaPerformance() {
        List<ComplaintSlaMetrics> all = slaTrackingService.getAllMetrics();

        Map<String, List<ComplaintSlaMetrics>> grouped = all.stream()
                .collect(Collectors
                        .groupingBy(m -> m.getDepartment() != null && !m.getDepartment().isBlank() ? m.getDepartment()
                                : "General Operations"));

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<String, List<ComplaintSlaMetrics>> entry : grouped.entrySet()) {
            String deptName = entry.getKey();
            List<ComplaintSlaMetrics> list = entry.getValue();

            long total = list.size();
            long open = list.stream().filter(m -> !"CLOSED".equalsIgnoreCase(m.getStatus())).count();
            long closed = list.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus())).count();
            long withinSla = list.stream()
                    .filter(m -> "RESOLVED_WITHIN_SLA".equalsIgnoreCase(m.getSlaStatus())
                            || ("CLOSED".equalsIgnoreCase(m.getStatus()) && !Boolean.TRUE.equals(m.getBreached())))
                    .count();
            long breached = list.stream()
                    .filter(m -> Boolean.TRUE.equals(m.getBreached()) || "BREACHED".equalsIgnoreCase(m.getSlaStatus()))
                    .count();
            long escalated = list.stream().filter(m -> "ESCALATED".equalsIgnoreCase(m.getSlaStatus())
                    || (m.getEscalationLevel() != null && m.getEscalationLevel() > 0)).count();

            double rate = closed > 0 ? Math.round(((double) withinSla / (double) closed) * 100.0)
                    : (total > 0 && breached == 0 ? 100.0 : 0.0);

            Map<String, Object> deptMap = new HashMap<>();
            deptMap.put("department", deptName);
            deptMap.put("total", total);
            deptMap.put("open", open);
            deptMap.put("closed", closed);
            deptMap.put("withinSla", withinSla);
            deptMap.put("breached", breached);
            deptMap.put("escalated", escalated);
            deptMap.put("complianceRate", rate);
            result.add(deptMap);
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Branch & District SLA Performance Breakdown
     */
    @GetMapping("/monitoring/branches")
    public ResponseEntity<List<Map<String, Object>>> getBranchSlaPerformance() {
        List<ComplaintSlaMetrics> all = slaTrackingService.getAllMetrics();

        Map<String, List<ComplaintSlaMetrics>> grouped = all.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getBranch() != null && !m.getBranch().isBlank() ? m.getBranch() : "Bole Branch"));

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map.Entry<String, List<ComplaintSlaMetrics>> entry : grouped.entrySet()) {
            String branchName = entry.getKey();
            List<ComplaintSlaMetrics> list = entry.getValue();

            String district = list.stream().map(ComplaintSlaMetrics::getDistrict).filter(Objects::nonNull).findFirst()
                    .orElse("Central District");
            long total = list.size();
            long open = list.stream().filter(m -> !"CLOSED".equalsIgnoreCase(m.getStatus())).count();
            long closed = list.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus())).count();
            long withinSla = list.stream()
                    .filter(m -> "RESOLVED_WITHIN_SLA".equalsIgnoreCase(m.getSlaStatus())
                            || ("CLOSED".equalsIgnoreCase(m.getStatus()) && !Boolean.TRUE.equals(m.getBreached())))
                    .count();
            long breached = list.stream()
                    .filter(m -> Boolean.TRUE.equals(m.getBreached()) || "BREACHED".equalsIgnoreCase(m.getSlaStatus()))
                    .count();

            double rate = closed > 0 ? Math.round(((double) withinSla / (double) closed) * 100.0)
                    : (total > 0 && breached == 0 ? 100.0 : 0.0);

            Map<String, Object> bMap = new HashMap<>();
            bMap.put("branch", branchName);
            bMap.put("district", district);
            bMap.put("total", total);
            bMap.put("open", open);
            bMap.put("closed", closed);
            bMap.put("withinSla", withinSla);
            bMap.put("breached", breached);
            bMap.put("complianceRate", rate);
            result.add(bMap);
        }

        return ResponseEntity.ok(result);
    }

    // Exportable Reports (CSV, Excel, Text PDF)
    @GetMapping("/reports/export/{format}")
    public ResponseEntity<byte[]> exportMonthlySlaReport(@PathVariable String format) {
        List<ComplaintSlaMetrics> all = slaTrackingService.getAllMetrics();
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        if ("csv".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            StringBuilder csv = new StringBuilder();
            csv.append("\uFEFF"); // BOM for Excel Unicode compatibility
            csv.append(
                    "Complaint ID,Priority,Category,Branch,District,Department,Requires Investigation,Current Stage,SLA Allowed Mins,SLA Elapsed Mins,Remaining Mins,SLA Status,Breached,Escalation Level,Created At,Resolved At\n");

            for (ComplaintSlaMetrics m : all) {
                csv.append(String.format(
                        "\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%d\",\"%d\",\"%d\",\"%s\",\"%s\",\"%d\",\"%s\",\"%s\"\n",
                        m.getComplaintId() != null ? m.getComplaintId() : "",
                        m.getPriority() != null ? m.getPriority() : "GENERAL",
                        m.getComplaintCategory() != null ? m.getComplaintCategory() : "",
                        m.getBranch() != null ? m.getBranch() : "",
                        m.getDistrict() != null ? m.getDistrict() : "",
                        m.getDepartment() != null ? m.getDepartment() : "",
                        Boolean.TRUE.equals(m.getRequiresInvestigation()) ? "YES" : "NO",
                        m.getCurrentStage() != null ? m.getCurrentStage() : "",
                        m.getTotalAllowedMinutes() != null ? m.getTotalAllowedMinutes() : 0,
                        m.getTotalElapsedMinutes() != null ? m.getTotalElapsedMinutes() : 0,
                        m.getRemainingMinutes() != null ? m.getRemainingMinutes() : 0,
                        m.getSlaStatus() != null ? m.getSlaStatus() : "ON_TRACK",
                        Boolean.TRUE.equals(m.getBreached()) ? "YES" : "NO",
                        m.getEscalationLevel() != null ? m.getEscalationLevel() : 0,
                        m.getCreatedAt() != null ? m.getCreatedAt().format(dtf) : "",
                        m.getResolvedAt() != null ? m.getResolvedAt().format(dtf) : ""));
            }

            byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
            String extension = "excel".equalsIgnoreCase(format) ? "xls" : "csv";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=Monthly_SLA_Governance_Report_"
                                    + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + "."
                                    + extension)
                    .contentType(MediaType
                            .parseMediaType("excel".equalsIgnoreCase(format) ? "application/vnd.ms-excel" : "text/csv"))
                    .body(bytes);
        } else {
            StringBuilder reportText = new StringBuilder();
            reportText.append("========================================================================\n");
            reportText.append("               DASHEN BANK S.C. - MONTHLY SLA GOVERNANCE REPORT         \n");
            reportText.append("========================================================================\n");
            reportText.append("Generated At: ").append(LocalDateTime.now().format(dtf)).append("\n\n");
            reportText.append(String.format("Total Complaints Processed: %d\n", all.size()));
            reportText.append(String.format("Active Complaints:          %d\n", all.stream().filter(m -> !"CLOSED".equalsIgnoreCase(m.getStatus())).count()));
            reportText.append(String.format("Closed Complaints:          %d\n", all.stream().filter(m -> "CLOSED".equalsIgnoreCase(m.getStatus())).count()));
            reportText.append(String.format("SLA Breaches Identified:    %d\n", all.stream().filter(m -> Boolean.TRUE.equals(m.getBreached())).count()));
            reportText.append("------------------------------------------------------------------------\n\n");
            reportText.append("COMPLAINT DETAILS & SLA STATUS:\n\n");
                            

            for (ComplaintSlaMetrics m : all) {
                reportText.append(String.format("ID: %-25s | Priority: %-15s | Stage: %-20s | SLA Status: %-18s\n",
                        m.getComplaintId(), m.getPriority(), m.getCurrentStage(), m.getSlaStatus()));
            }

            byte[] bytes = reportText.toString().getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Monthly_SLA_Report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".txt")
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(bytes);
        }
    }
}
