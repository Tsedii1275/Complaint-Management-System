package com.example.flowable_demo.service;

import com.example.flowable_demo.model.*;
import com.example.flowable_demo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class SlaTrackingService {

    @Autowired
    private ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired
    private TaskTimeTrackingRepository taskTimeTrackingRepository;

    @Autowired
    private SlaConfigService slaConfigService;

    @Autowired
    private BusinessHoursService businessHoursService;

    @Autowired
    private SlaBreachRecordRepository breachRecordRepository;

    @Autowired
    private SlaEscalationRecordRepository escalationRecordRepository;

    @Autowired
    private BranchRepository branchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    // Task definition key -> Lane mapping
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
        TASK_TO_LANE.put("FormTask_ChiefCommittee", "CHIEF_COMMITTEE");
    }

    public String getLaneName(String taskDefinitionKey) {
        return TASK_TO_LANE.getOrDefault(taskDefinitionKey, "UNKNOWN");
    }

    /**
     * Determines complaint priority classification (HIGHLY_SENSITIVE, SENSITIVE, GENERAL)
     */
    public String classifyPriority(String category, String description) {
        if (category == null) category = "";
        if (description == null) description = "";

        String combined = (category + " " + description).toLowerCase();
        if (combined.contains("fraud") || combined.contains("executive") || combined.contains("vip") || combined.contains("breach")) {
            return "HIGHLY_SENSITIVE";
        } else if (combined.contains("loan") || combined.contains("card") || combined.contains("sensitive")) {
            return "SENSITIVE";
        }
        return "GENERAL";
    }

    /**
     * Calculates overall SLA business minutes based on Priority and Investigation requirement.
     */
    public int calculateOverallSlaMinutes(String priority, boolean requiresInvestigation) {
        if ("HIGHLY_SENSITIVE".equalsIgnoreCase(priority)) {
            return requiresInvestigation
                ? slaConfigService.getAllowedMinutes("OVERALL_HS_INVESTIGATION", 13440)
                : slaConfigService.getAllowedMinutes("OVERALL_HS_NO_INVESTIGATION", 3840);
        } else if ("SENSITIVE".equalsIgnoreCase(priority)) {
            return requiresInvestigation
                ? slaConfigService.getAllowedMinutes("OVERALL_SENSITIVE_INVESTIGATION", 13440)
                : slaConfigService.getAllowedMinutes("OVERALL_SENSITIVE_NO_INVESTIGATION", 3840);
        } else {
            return requiresInvestigation
                ? slaConfigService.getAllowedMinutes("OVERALL_GENERAL_INVESTIGATION", 14400)
                : slaConfigService.getAllowedMinutes("OVERALL_GENERAL_NO_INVESTIGATION", 4800);
        }
    }

    /**
     * Calculates stage SLA business minutes.
     */
    public int calculateStageSlaMinutes(String stageName, String priority, String investigationType) {
        if (stageName == null) return 240;
        switch (stageName.toUpperCase()) {
            case "CMD_SCREENING", "CMD_SCREENING & ACKNOWLEDGMENT" -> {
                return slaConfigService.getAllowedMinutes("CMD_SCREENING", 240); // 4 Hours
            }
            case "FORWARDING", "FORWARD CASE TO WORK UNIT" -> {
                return slaConfigService.getAllowedMinutes("CMD_FORWARDING", 240); // 4 Hours
            }
            case "SERVICE_QUALITY_REVIEW" -> {
                return slaConfigService.getAllowedMinutes("SERVICE_QUALITY_REVIEW", 180); // 3 Hours
            }
            case "CXO_REVIEW" -> {
                return slaConfigService.getAllowedMinutes("CXO_REVIEW", 180); // 3 Hours
            }
            case "CEO_DIRECTION" -> {
                return slaConfigService.getAllowedMinutes("CEO_DIRECTION", 1440); // 3 Days
            }
            case "AUDIT_INVESTIGATION", "INVESTIGATION" -> {
                String type = investigationType != null ? investigationType.toLowerCase() : "";
                if (type.contains("account")) return slaConfigService.getAllowedMinutes("INVESTIGATION_CUSTOMER_ACCOUNT", 5280); // 11 Days
                if (type.contains("loan")) return slaConfigService.getAllowedMinutes("INVESTIGATION_LOAN", 7680); // 16 Days
                if (type.contains("ibd")) return slaConfigService.getAllowedMinutes("INVESTIGATION_IBD", 7680); // 16 Days
                if (type.contains("digital")) return slaConfigService.getAllowedMinutes("INVESTIGATION_DIGITAL_BANKING", 7680); // 16 Days
                return 7680; // 16 Days default
            }
            case "COMMITTEE_REVIEW", "CHIEF_COMMITTEE" -> {
                boolean isHsOrS = "HIGHLY_SENSITIVE".equalsIgnoreCase(priority) || "SENSITIVE".equalsIgnoreCase(priority);
                return isHsOrS ? slaConfigService.getAllowedMinutes("COMMITTEE_REVIEW_HS_S", 1440) : slaConfigService.getAllowedMinutes("COMMITTEE_REVIEW_GENERAL", 2400);
            }
            case "RESOLUTION", "WORK_UNIT_RESOLUTION" -> {
                if ("HIGHLY_SENSITIVE".equalsIgnoreCase(priority)) {
                    return slaConfigService.getAllowedMinutes("WORKUNIT_RESOLUTION_HS", 1920);
                } else if ("SENSITIVE".equalsIgnoreCase(priority)) {
                    return slaConfigService.getAllowedMinutes("WORKUNIT_RESOLUTION_SENSITIVE", 1920);
                } else {
                    return slaConfigService.getAllowedMinutes("WORKUNIT_RESOLUTION_GENERAL", 2880);
                }
            }
            case "NOTIFICATION", "NOTIFY_CUSTOMER" -> {
                return slaConfigService.getAllowedMinutes("CUSTOMER_NOTIFICATION", 240); // 4 Hours
            }
            default -> {
                return 480; // Default 8 hours
            }
        }
    }

    /**
     * Initializes SLA tracking for a new complaint using Dashen Business Hours calculation.
     */
    @Transactional
    public ComplaintSlaMetrics initializeSla(String processInstanceId, String complaintId, String category,
                                             String branch, String channel, String customerName) {
        LocalDateTime now = LocalDateTime.now();
        String districtName = getDistrictForBranch(branch);
        String priority = classifyPriority(category, "");

        int overallAllowedMinutes = calculateOverallSlaMinutes(priority, false);
        LocalDateTime overallDueTime = businessHoursService.addBusinessMinutes(now, overallAllowedMinutes);

        int cmdStageAllowedMinutes = calculateStageSlaMinutes("CMD_SCREENING", priority, null);
        LocalDateTime stageDueTime = businessHoursService.addBusinessMinutes(now, cmdStageAllowedMinutes);

        ComplaintSlaMetrics metrics = ComplaintSlaMetrics.builder()
                .processInstanceId(processInstanceId)
                .complaintId(complaintId)
                .complaintCategory(category)
                .priority(priority)
                .requiresInvestigation(false)
                .branch(branch)
                .district(districtName)
                .channel(channel != null && !channel.isBlank() ? channel : "web")
                .fcrStatus(false)
                .customerName(customerName != null && !customerName.isBlank() ? customerName : "Unknown Customer")
                .status("IN_PROGRESS")
                .currentStage("CMD_SCREENING")
                .currentStageStartedAt(now)
                .currentStageAllowedMinutes(cmdStageAllowedMinutes)
                .currentStageDueTime(stageDueTime)
                .currentStageElapsedMinutes(0)
                .currentStageStatus("ON_TRACK")
                .overallSlaStartTime(now)
                .overallSlaDueTime(overallDueTime)
                .totalAllowedMinutes(overallAllowedMinutes)
                .totalElapsedMinutes(0)
                .remainingMinutes(overallAllowedMinutes)
                .slaStatus("ON_TRACK")
                .breached(false)
                .deadline(overallDueTime)
                .createdAt(now)
                .branchStaffDuration(0)
                .cmdDuration(0)
                .auditDuration(0)
                .departmentDuration(0)
                .serviceQualityDuration(0)
                .escalationLevel(0)
                .build();

        return slaMetricsRepository.save(metrics);
    }

    /**
     * Advances complaint to next workflow stage with stage-specific SLA setup.
     */
    @Transactional
    public void advanceToStage(String processInstanceId, String newStage, Boolean requiresInvestigation, String investigationType) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (opt.isEmpty()) return;

        ComplaintSlaMetrics metrics = opt.get();
        LocalDateTime now = LocalDateTime.now();

        if (requiresInvestigation != null) {
            metrics.setRequiresInvestigation(requiresInvestigation);
            int recalculatedOverallAllowed = calculateOverallSlaMinutes(metrics.getPriority(), requiresInvestigation);
            metrics.setTotalAllowedMinutes(recalculatedOverallAllowed);
            metrics.setOverallSlaDueTime(businessHoursService.addBusinessMinutes(metrics.getOverallSlaStartTime() != null ? metrics.getOverallSlaStartTime() : metrics.getCreatedAt(), recalculatedOverallAllowed));
            metrics.setDeadline(metrics.getOverallSlaDueTime());
        }
        if (investigationType != null) {
            metrics.setInvestigationType(investigationType);
        }

        metrics.setCurrentStage(newStage);
        metrics.setCurrentStageStartedAt(now);

        int stageAllowedMinutes = calculateStageSlaMinutes(newStage, metrics.getPriority(), metrics.getInvestigationType());
        metrics.setCurrentStageAllowedMinutes(stageAllowedMinutes);
        metrics.setCurrentStageDueTime(businessHoursService.addBusinessMinutes(now, stageAllowedMinutes));
        metrics.setCurrentStageElapsedMinutes(0);
        metrics.setCurrentStageStatus("ON_TRACK");

        recalculateSlaStatus(metrics);
        slaMetricsRepository.save(metrics);
    }

    // Record task start (Assignment)
    @Transactional
    public TaskTimeTracking recordTaskStart(String processInstanceId, String complaintId,
                                            String taskId, String taskDefinitionKey,
                                            String taskName, String assignedUser) {
        String laneName = getLaneName(taskDefinitionKey);
        int responseTarget = taskDefinitionKey != null && taskDefinitionKey.toLowerCase().contains("intake") ? 30 : 240;
        int resolutionTarget = calculateStageSlaMinutes(taskDefinitionKey, "GENERAL", null);

        TaskTimeTracking tracking = TaskTimeTracking.builder()
                .processInstanceId(processInstanceId)
                .complaintId(complaintId)
                .taskId(taskId)
                .taskDefinitionKey(taskDefinitionKey)
                .taskName(taskName)
                .laneName(laneName)
                .assignedUser(assignedUser)
                .startedAt(LocalDateTime.now())
                .isClaimed(assignedUser != null && !assignedUser.isBlank() && !"initiator".equals(assignedUser))
                .claimedBy(assignedUser != null && !"initiator".equals(assignedUser) ? assignedUser : null)
                .claimedAt(assignedUser != null && !"initiator".equals(assignedUser) ? LocalDateTime.now() : null)
                .responseSlaTargetMinutes(responseTarget)
                .responseSlaStatus("ON_TIME")
                .resolutionSlaTargetMinutes(resolutionTarget)
                .resolutionSlaStatus("ON_TIME")
                .build();

        return taskTimeTrackingRepository.save(tracking);
    }

    // Record task claim (Response SLA Evaluation)
    @Transactional
    public TaskTimeTracking recordTaskClaim(String taskId, String username) {
        return recordTaskClaim(taskId, username, null, null, null, null);
    }

    @Transactional
    public TaskTimeTracking recordTaskClaim(String taskId, String username, String processInstanceId, String complaintId, String taskDefinitionKey, String taskName) {
        Optional<TaskTimeTracking> trackingOpt = taskTimeTrackingRepository.findByTaskId(taskId);
        TaskTimeTracking tracking;
        LocalDateTime now = LocalDateTime.now();

        if (trackingOpt.isPresent()) {
            tracking = trackingOpt.get();
        } else {
            String laneName = getLaneName(taskDefinitionKey);
            tracking = TaskTimeTracking.builder()
                    .processInstanceId(processInstanceId)
                    .complaintId(complaintId)
                    .taskId(taskId)
                    .taskDefinitionKey(taskDefinitionKey)
                    .taskName(taskName)
                    .laneName(laneName)
                    .startedAt(now.minusMinutes(5))
                    .responseSlaTargetMinutes(30)
                    .resolutionSlaTargetMinutes(240)
                    .build();
        }

        tracking.setClaimedAt(now);
        tracking.setClaimedBy(username);
        tracking.setAssignedUser(username);
        tracking.setIsClaimed(true);

        if (tracking.getStartedAt() != null) {
            long responseMins = businessHoursService.calculateElapsedBusinessMinutes(tracking.getStartedAt(), now);
            tracking.setResponseTimeMinutes(responseMins);

            int responseTarget = tracking.getResponseSlaTargetMinutes() != null ? tracking.getResponseSlaTargetMinutes() : 30;
            if (responseMins <= responseTarget) {
                tracking.setResponseSlaStatus("ON_TIME");
                tracking.setResponseBreachDurationMinutes(0L);
            } else {
                tracking.setResponseSlaStatus("BREACHED");
                tracking.setResponseBreachDurationMinutes(responseMins - responseTarget);
            }
        }
        return taskTimeTrackingRepository.save(tracking);
    }

    // Record task completion (Resolution SLA Evaluation)
    @Transactional
    public void recordTaskCompletion(String taskId, String completedBy) {
        Optional<TaskTimeTracking> trackingOpt = taskTimeTrackingRepository.findByTaskId(taskId);
        if (trackingOpt.isEmpty()) return;

        TaskTimeTracking tracking = trackingOpt.get();
        LocalDateTime now = LocalDateTime.now();
        tracking.setCompletedAt(now);
        if (completedBy != null) {
            tracking.setAssignedUser(completedBy);
            if (tracking.getClaimedBy() == null) {
                tracking.setClaimedBy(completedBy);
                tracking.setClaimedAt(now);
                tracking.setIsClaimed(true);
            }
        }

        LocalDateTime startTimeForResolution = tracking.getClaimedAt() != null ? tracking.getClaimedAt() : tracking.getStartedAt();
        if (startTimeForResolution != null) {
            long resolutionMins = businessHoursService.calculateElapsedBusinessMinutes(startTimeForResolution, now);
            double hours = resolutionMins / 60.0;
            tracking.setResolutionTimeMinutes(resolutionMins);
            tracking.setDurationMinutes(resolutionMins);
            tracking.setDurationHours(Math.round(hours * 100.0) / 100.0);

            int resolutionTarget = tracking.getResolutionSlaTargetMinutes() != null
                    ? tracking.getResolutionSlaTargetMinutes()
                    : calculateStageSlaMinutes(tracking.getTaskDefinitionKey(), "GENERAL", null);
            tracking.setResolutionSlaTargetMinutes(resolutionTarget);

            if (resolutionMins <= resolutionTarget) {
                tracking.setResolutionSlaStatus("ON_TIME");
                tracking.setResolutionBreachDurationMinutes(0L);
            } else {
                tracking.setResolutionSlaStatus("BREACHED");
                tracking.setResolutionBreachDurationMinutes(resolutionMins - resolutionTarget);
            }
        }
        taskTimeTrackingRepository.save(tracking);

        updateLaneDuration(tracking.getProcessInstanceId(), tracking.getLaneName(),
                tracking.getDurationMinutes() != null ? tracking.getDurationMinutes().intValue() : 0);
    }

    public List<TaskTimeTracking> getStageTimeline(String complaintId) {
        return taskTimeTrackingRepository.findByComplaintId(complaintId);
    }

    // Update lane-specific duration
    @Transactional
    public void updateLaneDuration(String processInstanceId, String laneName, int additionalMinutes) {
        Optional<ComplaintSlaMetrics> metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (metricsOpt.isEmpty()) return;

        ComplaintSlaMetrics metrics = metricsOpt.get();

        switch (laneName) {
            case "BRANCH_STAFF", "CONTACT_CENTER" -> metrics.setBranchStaffDuration(metrics.getBranchStaffDuration() + additionalMinutes);
            case "CMD_OFFICER" -> metrics.setCmdDuration(metrics.getCmdDuration() + additionalMinutes);
            case "AUDIT_TEAM" -> metrics.setAuditDuration(metrics.getAuditDuration() + additionalMinutes);
            case "DEPARTMENT_WORKUNIT" -> metrics.setDepartmentDuration(metrics.getDepartmentDuration() + additionalMinutes);
            case "SERVICE_QUALITY" -> metrics.setServiceQualityDuration(metrics.getServiceQualityDuration() + additionalMinutes);
        }

        recalculateSlaStatus(metrics);
        slaMetricsRepository.save(metrics);
    }

    /**
     * Recalculates SLA metrics based on business working hours elapsed.
     */
    public void recalculateSlaStatus(ComplaintSlaMetrics metrics) {
        LocalDateTime startTime = metrics.getOverallSlaStartTime() != null ? metrics.getOverallSlaStartTime() : metrics.getCreatedAt();
        if (startTime == null) return;

        LocalDateTime endTime = metrics.getResolvedAt() != null ? metrics.getResolvedAt() : LocalDateTime.now();
        long elapsedBusinessMinutes = businessHoursService.calculateElapsedBusinessMinutes(startTime, endTime);
        metrics.setTotalElapsedMinutes((int) elapsedBusinessMinutes);

        int allowed = metrics.getTotalAllowedMinutes() != null ? metrics.getTotalAllowedMinutes() : 480;
        int remaining = (int) Math.max(0, allowed - elapsedBusinessMinutes);
        metrics.setRemainingMinutes(remaining);

        // Stage SLA calculation
        if (metrics.getCurrentStageStartedAt() != null) {
            long stageElapsed = businessHoursService.calculateElapsedBusinessMinutes(metrics.getCurrentStageStartedAt(), endTime);
            metrics.setCurrentStageElapsedMinutes((int) stageElapsed);
            int stageAllowed = metrics.getCurrentStageAllowedMinutes() != null ? metrics.getCurrentStageAllowedMinutes() : 240;
            if (stageElapsed > stageAllowed) {
                metrics.setCurrentStageStatus("BREACHED");
            } else if (stageElapsed >= (int) (stageAllowed * 0.80)) {
                metrics.setCurrentStageStatus("APPROACHING");
            } else {
                metrics.setCurrentStageStatus("ON_TRACK");
            }
        }

        if (metrics.getResolvedAt() != null) {
            if (elapsedBusinessMinutes <= allowed) {
                metrics.setSlaStatus("RESOLVED_WITHIN_SLA");
                metrics.setBreached(false);
            } else {
                metrics.setSlaStatus("RESOLVED_AFTER_SLA");
                metrics.setBreached(true);
            }
        } else {
            if (metrics.getEscalationLevel() != null && metrics.getEscalationLevel() > 0) {
                metrics.setSlaStatus("ESCALATED");
            } else if (elapsedBusinessMinutes > allowed) {
                metrics.setSlaStatus("BREACHED");
                metrics.setBreached(true);
            } else if (elapsedBusinessMinutes >= (int) (allowed * 0.80)) {
                metrics.setSlaStatus("APPROACHING");
            } else {
                metrics.setSlaStatus("ON_TRACK");
            }
        }
    }

    // Mark resolved
    @Transactional
    public void markResolved(String processInstanceId) {
        Optional<ComplaintSlaMetrics> metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (metricsOpt.isEmpty()) return;

        ComplaintSlaMetrics metrics = metricsOpt.get();
        LocalDateTime now = LocalDateTime.now();
        metrics.setResolvedAt(now);
        metrics.setStatus("CLOSED");
        metrics.setCurrentStage("COMPLETED");
        recalculateSlaStatus(metrics);
        slaMetricsRepository.save(metrics);
    }

    // Get metrics
    public Optional<ComplaintSlaMetrics> getMetricsByProcessInstanceId(String processInstanceId) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        opt.ifPresent(m -> {
            recalculateSlaStatus(m);
            slaMetricsRepository.save(m);
        });
        return opt;
    }

    public Optional<ComplaintSlaMetrics> getMetricsByComplaintId(String complaintId) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByComplaintId(complaintId);
        opt.ifPresent(m -> {
            recalculateSlaStatus(m);
            slaMetricsRepository.save(m);
        });
        return opt;
    }

    public List<ComplaintSlaMetrics> getAllMetrics() {
        List<ComplaintSlaMetrics> all = slaMetricsRepository.findAll();
        for (ComplaintSlaMetrics m : all) {
            if (!"CLOSED".equalsIgnoreCase(m.getStatus())) {
                recalculateSlaStatus(m);
            }
        }
        return all;
    }

    // Initialize FCR SLA
    @Transactional
    public void initializeFcrSla(String ticket, String category, String branch, String customerName, String channel) {
        LocalDateTime now = LocalDateTime.now();
        String districtName = getDistrictForBranch(branch);

        ComplaintSlaMetrics metrics = ComplaintSlaMetrics.builder()
                .processInstanceId("FCR-" + ticket)
                .complaintId(ticket)
                .complaintCategory(category)
                .priority("GENERAL")
                .branch(branch != null && !branch.isBlank() ? branch : "Bole Branch")
                .district(districtName)
                .channel(channel != null && !channel.isBlank() ? channel : "branch")
                .fcrStatus(true)
                .status("CLOSED")
                .customerName(customerName != null && !customerName.isBlank() ? customerName : "Unknown Customer")
                .currentStage("COMPLETED")
                .slaStatus("RESOLVED_WITHIN_SLA")
                .breached(false)
                .totalAllowedMinutes(480)
                .totalElapsedMinutes(0)
                .remainingMinutes(480)
                .createdAt(now)
                .resolvedAt(now)
                .build();
        slaMetricsRepository.save(metrics);
    }

    @Transactional
    public void updateComplaintDetails(String processInstanceId, String branch, String district, String category,
                                       String department, String manager, Long assignedUserId) {
        Optional<ComplaintSlaMetrics> opt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
        if (opt.isPresent()) {
            ComplaintSlaMetrics m = opt.get();
            if (branch != null && !branch.isBlank()) {
                m.setBranch(branch);
                if (district == null || district.isBlank()) {
                    m.setDistrict(getDistrictForBranch(branch));
                }
            }
            if (district != null && !district.isBlank()) m.setDistrict(district);
            if (category != null && !category.isBlank()) {
                m.setComplaintCategory(category);
                m.setPriority(classifyPriority(category, ""));
            }
            if (department != null && !department.isBlank()) m.setDepartment(department);
            if (manager != null && !manager.isBlank()) m.setManager(manager);
            if (assignedUserId != null) m.setAssignedUserId(assignedUserId);
            slaMetricsRepository.save(m);
        }
    }

    public String getDistrictForBranch(String branchName) {
        if (branchName == null || branchName.isBlank()) return "Central District";
        var bOpt = branchRepository.findByName(branchName.trim());
        if (bOpt.isPresent() && bOpt.get().getDistrict() != null) {
            return bOpt.get().getDistrict().getName();
        }
        return "Central District";
    }

    public List<TaskTimeTracking> getTaskTrackingByProcessInstanceId(String processInstanceId) {
        return taskTimeTrackingRepository.findByProcessInstanceId(processInstanceId);
    }

    // Build SLA report map
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
        report.put("priority", m.getPriority());
        report.put("requiresInvestigation", m.getRequiresInvestigation());
        report.put("investigationType", m.getInvestigationType());
        report.put("currentStage", m.getCurrentStage());
        report.put("currentStageStatus", m.getCurrentStageStatus());
        report.put("currentStageElapsedMinutes", m.getCurrentStageElapsedMinutes());
        report.put("currentStageAllowedMinutes", m.getCurrentStageAllowedMinutes());
        report.put("totalAllowedMinutes", m.getTotalAllowedMinutes());
        report.put("totalElapsedMinutes", m.getTotalElapsedMinutes());
        report.put("remainingMinutes", m.getRemainingMinutes());
        report.put("slaStatus", m.getSlaStatus());
        report.put("escalationLevel", m.getEscalationLevel());
        report.put("breached", m.getBreached());
        report.put("deadline", m.getOverallSlaDueTime() != null ? m.getOverallSlaDueTime().toString() : (m.getDeadline() != null ? m.getDeadline().toString() : null));
        report.put("createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        report.put("resolvedAt", m.getResolvedAt() != null ? m.getResolvedAt().toString() : null);

        List<TaskTimeTracking> tasks = getTaskTrackingByProcessInstanceId(processInstanceId);
        LocalDateTime now = LocalDateTime.now();

        long branchStaffDuration = m.getBranchStaffDuration();
        long cmdDuration = m.getCmdDuration();
        long auditDuration = m.getAuditDuration();
        long departmentDuration = m.getDepartmentDuration();
        long serviceQualityDuration = m.getServiceQualityDuration();

        List<Map<String, Object>> taskList = tasks.stream().map(t -> {
            Map<String, Object> taskMap = new HashMap<>();
            taskMap.put("taskId", t.getTaskId());
            taskMap.put("taskName", t.getTaskName());
            taskMap.put("laneName", t.getLaneName());
            taskMap.put("assignedUser", t.getAssignedUser());
            taskMap.put("startedAt", t.getStartedAt() != null ? t.getStartedAt().toString() : null);
            taskMap.put("completedAt", t.getCompletedAt() != null ? t.getCompletedAt().toString() : null);

            if (t.getCompletedAt() == null && t.getStartedAt() != null) {
                long activeMinutes = businessHoursService.calculateElapsedBusinessMinutes(t.getStartedAt(), now);
                double activeHours = Math.round((activeMinutes / 60.0) * 100.0) / 100.0;
                taskMap.put("durationMinutes", activeMinutes);
                taskMap.put("durationHours", activeHours);
                taskMap.put("inProgress", true);
            } else {
                taskMap.put("durationMinutes", t.getDurationMinutes());
                taskMap.put("durationHours", t.getDurationHours());
                taskMap.put("inProgress", false);
            }
            return taskMap;
        }).toList();

        Map<String, Object> laneMetrics = new HashMap<>();
        laneMetrics.put("branchStaffDuration", branchStaffDuration);
        laneMetrics.put("cmdDuration", cmdDuration);
        laneMetrics.put("auditDuration", auditDuration);
        laneMetrics.put("departmentDuration", departmentDuration);
        laneMetrics.put("serviceQualityDuration", serviceQualityDuration);

        report.put("laneMetrics", laneMetrics);
        report.put("taskTracking", taskList);

        return report;
    }

    @Transactional
    public void clearAllSlaData() {
        slaMetricsRepository.deleteAll();
        taskTimeTrackingRepository.deleteAll();
        breachRecordRepository.deleteAll();
        escalationRecordRepository.deleteAll();
        auditLogRepository.deleteAll();
    }
}
