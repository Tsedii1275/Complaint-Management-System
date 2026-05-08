package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.AuditLog;
import com.example.flowable_demo.service.AuditService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@CrossOrigin(originPatterns = "*")
public class AuditController {

    @Autowired
    private AuditService auditService;

    @GetMapping("/logs")
    public List<AuditLog> getLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String complaintId,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return auditService.getLogs(action, complaintId, actor, startDate, endDate);
    }
}
