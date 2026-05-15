package com.example.flowable_demo.service;

import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.model.TaskTimeTracking;
import com.example.flowable_demo.repository.ComplaintSlaMetricsRepository;
import com.example.flowable_demo.repository.TaskTimeTrackingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SlaTrackingService {

    @Autowired
    private ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired
    private TaskTimeTrackingRepository taskTimeTrackingRepository;

    // ─── Category → SLA minutes mapping (configurable) ───
    private static final Map<String, Integer> CATEGORY_SLA_MAP = new HashMap<>();
    static {
        CATEGORY_SLA_MAP.put("atm", 120);           // 2 hours
        CATEGORY_SLA_MAP.put("card", 240);           // 4 hours
        CATEGORY_SLA_MAP.put("mobile", 360);         // 6 hours
        CATEGORY_SLA_MAP.put("fraud", 1440);         // 24 hours
        CATEGORY_SLA_MAP.put("account", 480);        // 8 hours
        CATEGORY_SLA_MAP.put("loan", 720);           // 12 hours
        CATEGORY_SLA_MAP.put("transfer", 240);       // 4 hours
        CATEGORY_SLA_MAP.put("technical", 360);      // 6 hours
        CATEGORY_SLA_MAP.put("general", 480);        // 8 hours (default)
    }

    // ─── Task definition key → Lane name mapping ───
    private static final Map<String, String> TASK_TO_LANE = new HashMap<>();
    static {
        TASK_TO_LANE.put("FormTask_12", "BRANCH_STAFF");
        TASK_TO_LANE.put("FormTask_16", "BRANCH_STAFF");
        TASK_TO_LANE.put("FormTask_20", "CONTACT_CENTER");
        TASK_TO_LANE.put("FormTask_24", "BRANCH_STAFF");
        TASK_TO_LANE.put("FormTask_67", "CUSTOMER");
        TASK_TO_LANE.put("FormTask_43", "CMD_OFFICER");
        TASK_TO_LANE.put("FormTask_48", "AUDIT_TEAM");
        TASK_TO_LANE.put("FormTask_57", "DEPARTMENT_WORKUNIT");
        TASK_TO_LANE.put("ServiceTask_65", "SERVICE_QUALITY");
    }

    public int getAllowedMinutes(String category) {
        if (category == null) return CATEGORY_SLA_MAP.getOrDefault("general", 480);
        return CATEGORY_SLA_MAP.getOrDefault(category.toLowerCase(), 480);
    }

    public String getLaneName(String taskDefinitionKey) {
        return TASK_TO_LANE.getOrDefault(taskDefinitionKey, "UNKNOWN");
    }

    // ─── Initialize SLA metrics when a complaint is created ───
    @Transactional
    public ComplaintSlaMetrics initializeSla(String processInstanceId, String complaintId, String category) {
        int allowedMinutes = getAllowedMinutes(category);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadline = now.plusMinutes(allowedMinutes);

        ComplaintSlaMetrics metrics = ComplaintSlaMetrics.builder()
                .processInstanceId(processInstanceId)
                .complaintId(complaintId)
                .complaintCategory(category)
                .totalAllowedMinutes(allowedMinutes)
                .totalElapsedMinutes(0)
                .remainingMinutes(allowedMinutes)
                .slaStatus("ON_TIME")
                .breached(false)
                .deadline(deadline)
                .branchStaffDuration(0)
                .cmdDuration(0)
                .auditDuration(0)
                .departmentDuration(0)
                .serviceQualityDuration(0)
                .build();

        return slaMetricsRepository.save(metrics);
    }

    // ─── Record task start ───
    @Transactional
    public TaskTimeTracking recordTaskStart(String processInstanceId, String complaintId,
                                            String taskId, String taskDefinitionKey,
                                            String taskName, String assignedUser) {
        String laneName = getLaneName(taskDefinitionKey);

        TaskTimeTracking tracking = TaskTimeTracking.builder()
                .processInstanceId(processInstanceId)
                .complaintId(complaintId)
                .taskId(taskId)
                .taskDefinitionKey(taskDefinitionKey)
                .taskName(taskName)
                .laneName(laneName)
                .assignedUser(assignedUser)
                .startedAt(LocalDateTime.now())
                .build();

        return taskTimeTrackingRepository.save(tracking);
    }

    // ─── Record task completion and update lane durations ───
    @Transactional
    public void recordTaskCompletion(String taskId, String completedBy) {
        Optional<TaskTimeTracking> trackingOpt = taskTimeTrackingRepository.findByTaskId(taskId);
        if (trackingOpt.isEmpty()) return;

        TaskTimeTracking tracking = trackingOpt.get();
        LocalDateTime now = LocalDateTime.now();
        tracking.setCompletedAt(now);

        if (tracking.getStartedAt() != null) {
            long minutes = Duration.between(tracking.getStartedAt(), now).toMinutes();
            double hours = minutes / 60.0;
            tracking.setDurationMinutes(minutes);
            tracking.setDurationHours(Math.round(hours * 100.0) / 100.0);
        }
        if (completedBy != null) {
            tracking.setAssignedUser(completedBy);
        }
        taskTimeTrackingRepository.save(tracking);

        // Update the lane duration in SLA metrics
        updateLaneDuration(tracking.getProcessInstanceId(), tracking.getLaneName(),
                tracking.getDurationMinutes() != null ? tracking.getDurationMinutes().intValue() : 0);
    }

    // ─── Update lane-specific duration in SLA metrics ───
    @Transactional
    public void updateLaneDuration(String processInstanceId, String laneName, int additionalMinutes) {
        Optional<ComplaintSlaMetrics> metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (metricsOpt.isEmpty()) return;

        ComplaintSlaMetrics metrics = metricsOpt.get();

        switch (laneName) {
            case "BRANCH_STAFF", "CONTACT_CENTER" ->
                    metrics.setBranchStaffDuration(metrics.getBranchStaffDuration() + additionalMinutes);
            case "CMD_OFFICER" ->
                    metrics.setCmdDuration(metrics.getCmdDuration() + additionalMinutes);
            case "AUDIT_TEAM" ->
                    metrics.setAuditDuration(metrics.getAuditDuration() + additionalMinutes);
            case "DEPARTMENT_WORKUNIT" ->
                    metrics.setDepartmentDuration(metrics.getDepartmentDuration() + additionalMinutes);
            case "SERVICE_QUALITY" ->
                    metrics.setServiceQualityDuration(metrics.getServiceQualityDuration() + additionalMinutes);
        }

        // Recalculate totals
        recalculateSlaStatus(metrics);
        slaMetricsRepository.save(metrics);
    }

    // ─── Recalculate SLA status based on elapsed time ───
    public void recalculateSlaStatus(ComplaintSlaMetrics metrics) {
        if (metrics.getCreatedAt() == null) return;

        LocalDateTime now = LocalDateTime.now();
        long elapsedMinutes = Duration.between(metrics.getCreatedAt(), now).toMinutes();
        metrics.setTotalElapsedMinutes((int) elapsedMinutes);

        int remaining = metrics.getTotalAllowedMinutes() - (int) elapsedMinutes;
        metrics.setRemainingMinutes(Math.max(remaining, 0));

        double threshold = metrics.getTotalAllowedMinutes() * 0.20; // 20% remaining

        if (remaining <= 0) {
            if (metrics.getResolvedAt() != null) {
                // Resolved but was overdue
                metrics.setSlaStatus("BREACHED");
            } else {
                metrics.setSlaStatus("OVERDUE");
            }
            metrics.setBreached(true);
        } else if (remaining <= threshold) {
            metrics.setSlaStatus("APPROACHING");
        } else {
            metrics.setSlaStatus("ON_TIME");
        }
    }

    // ─── Mark complaint as resolved ───
    @Transactional
    public void markResolved(String processInstanceId) {
        Optional<ComplaintSlaMetrics> metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (metricsOpt.isEmpty()) return;

        ComplaintSlaMetrics metrics = metricsOpt.get();
        metrics.setResolvedAt(LocalDateTime.now());
        recalculateSlaStatus(metrics);
        slaMetricsRepository.save(metrics);
    }

    // ─── Get SLA metrics for a complaint ───
    public Optional<ComplaintSlaMetrics> getMetricsByProcessInstanceId(String processInstanceId) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        opt.ifPresent(this::recalculateSlaStatus);
        return opt;
    }

    public Optional<ComplaintSlaMetrics> getMetricsByComplaintId(String complaintId) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByComplaintId(complaintId);
        opt.ifPresent(this::recalculateSlaStatus);
        return opt;
    }

    // ─── Get all SLA metrics (for admin dashboard) ───
    public List<ComplaintSlaMetrics> getAllMetrics() {
        List<ComplaintSlaMetrics> all = slaMetricsRepository.findAll();
        all.forEach(this::recalculateSlaStatus);
        return all;
    }

    // ─── Get task time tracking for a complaint ───
    public List<TaskTimeTracking> getTaskTrackingByProcessInstanceId(String processInstanceId) {
        return taskTimeTrackingRepository.findByProcessInstanceId(processInstanceId);
    }

    public List<TaskTimeTracking> getTaskTrackingByComplaintId(String complaintId) {
        return taskTimeTrackingRepository.findByComplaintId(complaintId);
    }

    // ─── Build a complete SLA report for a single complaint ───
    public Map<String, Object> buildSlaReport(String processInstanceId) {
        Map<String, Object> report = new HashMap<>();

        Optional<ComplaintSlaMetrics> metricsOpt = getMetricsByProcessInstanceId(processInstanceId);
        if (metricsOpt.isEmpty()) {
            report.put("available", false);
            return report;
        }

        ComplaintSlaMetrics m = metricsOpt.get();
        report.put("available", true);
        report.put("complaintId", m.getComplaintId());
        report.put("category", m.getComplaintCategory());
        report.put("totalAllowedMinutes", m.getTotalAllowedMinutes());
        report.put("totalElapsedMinutes", m.getTotalElapsedMinutes());
        report.put("remainingMinutes", m.getRemainingMinutes());
        report.put("slaStatus", m.getSlaStatus());
        report.put("breached", m.getBreached());
        report.put("deadline", m.getDeadline() != null ? m.getDeadline().toString() : null);
        report.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        report.put("resolvedAt", m.getResolvedAt() != null ? m.getResolvedAt().toString() : null);

        // Lane durations
        Map<String, Object> laneMetrics = new HashMap<>();
        laneMetrics.put("branchStaffDuration", m.getBranchStaffDuration());
        laneMetrics.put("cmdDuration", m.getCmdDuration());
        laneMetrics.put("auditDuration", m.getAuditDuration());
        laneMetrics.put("departmentDuration", m.getDepartmentDuration());
        laneMetrics.put("serviceQualityDuration", m.getServiceQualityDuration());
        report.put("laneMetrics", laneMetrics);

        // Individual task tracking
        List<TaskTimeTracking> tasks = getTaskTrackingByProcessInstanceId(processInstanceId);
        List<Map<String, Object>> taskList = tasks.stream().map(t -> {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("taskId", t.getTaskId());
            taskMap.put("taskName", t.getTaskName());
            taskMap.put("laneName", t.getLaneName());
            taskMap.put("assignedUser", t.getAssignedUser());
            taskMap.put("startedAt", t.getStartedAt() != null ? t.getStartedAt().toString() : null);
            taskMap.put("completedAt", t.getCompletedAt() != null ? t.getCompletedAt().toString() : null);
            taskMap.put("durationMinutes", t.getDurationMinutes());
            taskMap.put("durationHours", t.getDurationHours());
            return taskMap;
        }).toList();
        report.put("taskTracking", taskList);

        return report;
    }
}
