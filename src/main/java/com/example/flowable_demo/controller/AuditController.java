package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.AuditLog;
import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.model.TaskTimeTracking;
import com.example.flowable_demo.service.AuditService;
import com.example.flowable_demo.service.SlaTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    @Autowired
    private AuditService auditService;

    @Autowired
    private SlaTrackingService slaTrackingService;

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
        return ResponseEntity.ok(slaTrackingService.getAllMetrics());
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
}
