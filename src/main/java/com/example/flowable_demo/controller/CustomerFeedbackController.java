package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.CustomerFeedback;
import com.example.flowable_demo.repository.CustomerFeedbackRepository;
import com.example.flowable_demo.repository.ComplaintSlaMetricsRepository;
import com.example.flowable_demo.service.AuditService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class CustomerFeedbackController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private CustomerFeedbackRepository feedbackRepository;

    @Autowired
    private ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired
    private AuditService auditService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private com.example.flowable_demo.service.NotificationService notificationService;

    @GetMapping("/customer-feedback/init-db")
    public ResponseEntity<String> initDb() {
        String[] alters = {
            "ALTER TABLE customer_feedback ADD COLUMN complaint_id varchar(100) DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN ticket_number varchar(100) DEFAULT ''",
            "ALTER TABLE customer_feedback ADD COLUMN resolution_confirmed bit(1) DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN csat_score int DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN nps_score int DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN nps_comment text",
            "ALTER TABLE customer_feedback ADD COLUMN ces_score int DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN ces_comment text",
            "ALTER TABLE customer_feedback ADD COLUMN additional_comments text",
            "ALTER TABLE customer_feedback ADD COLUMN reopened_case bit(1) DEFAULT b'0'",
            "ALTER TABLE customer_feedback ADD COLUMN secure_token varchar(100) DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN token_expired bit(1) DEFAULT b'0'",
            "ALTER TABLE customer_feedback ADD COLUMN feedback_request_sent_at timestamp NULL DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN feedback_submitted_at timestamp NULL DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN feedback_response_time bigint DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN reopen_count int DEFAULT '0'",
            "ALTER TABLE customer_feedback ADD COLUMN customer_satisfaction_status varchar(30) DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD UNIQUE KEY UK_feedback_token (secure_token)",
            "ALTER TABLE customer_feedback MODIFY COLUMN satisfied bit(1) DEFAULT NULL",
            "ALTER TABLE customer_feedback MODIFY COLUMN comment text DEFAULT NULL",
            "ALTER TABLE customer_feedback MODIFY COLUMN ticket_id varchar(100) DEFAULT NULL",
            "ALTER TABLE customer_feedback ADD COLUMN preferred_language varchar(30) DEFAULT 'english'",
            "ALTER TABLE complaint_sla_metrics ADD COLUMN department varchar(100) DEFAULT NULL",
            "ALTER TABLE complaint_sla_metrics ADD COLUMN manager varchar(100) DEFAULT NULL",
            "ALTER TABLE complaint_sla_metrics ADD COLUMN assigned_user_id bigint DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN district varchar(100) DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN branch varchar(100) DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN department varchar(100) DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN full_name varchar(255) DEFAULT NULL"
        };
        
        StringBuilder log = new StringBuilder("Database Update Log:\n");
        for (String sql : alters) {
            try {
                jdbcTemplate.execute(sql);
                log.append("SUCCESS: ").append(sql).append("\n");
            } catch (Exception e) {
                log.append("SKIPPED/FAILED: ").append(sql).append(" (Reason: ").append(e.getMessage()).append(")\n");
            }
        }
        return ResponseEntity.ok(log.toString());
    }

    @GetMapping("/customer-feedback/validate")
    public ResponseEntity<?> validateToken(@RequestParam String token) {
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token is required"));
        }
        var feedbackOpt = feedbackRepository.findBySecureToken(token);
        if (feedbackOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Invalid feedback token"));
        }
        var feedback = feedbackOpt.get();
        if (Boolean.TRUE.equals(feedback.getTokenExpired())) {
            return ResponseEntity.badRequest().body(Map.of("error", "This feedback request has already been submitted or expired."));
        }
        return ResponseEntity.ok(Map.of(
            "valid", true,
            "ticketNumber", feedback.getTicketNumber(),
            "complaintId", feedback.getComplaintId() != null ? feedback.getComplaintId() : "",
            "preferredLanguage", feedback.getPreferredLanguage() != null ? feedback.getPreferredLanguage() : "english"
        ));
    }

    @PostMapping("/customer-feedback")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> body) {
        String token = (String) body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token is required"));
        }

        var feedbackOpt = feedbackRepository.findBySecureToken(token);
        if (feedbackOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Invalid feedback token"));
        }

        CustomerFeedback feedback = feedbackOpt.get();
        if (Boolean.TRUE.equals(feedback.getTokenExpired())) {
            return ResponseEntity.badRequest().body(Map.of("error", "This feedback link has already been submitted or expired."));
        }

        Object satisfiedObj = body.get("satisfied");
        if (satisfiedObj == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Resolution satisfaction is required"));
        }
        boolean satisfied = Boolean.parseBoolean(satisfiedObj.toString());

        // Extract scores
        Integer csatScore = body.get("csatScore") != null ? Integer.parseInt(body.get("csatScore").toString()) : null;
        Integer npsScore = body.get("npsScore") != null ? Integer.parseInt(body.get("npsScore").toString()) : null;
        String npsComment = (String) body.getOrDefault("npsComment", "");
        Integer cesScore = body.get("cesScore") != null ? Integer.parseInt(body.get("cesScore").toString()) : null;
        String cesComment = (String) body.getOrDefault("cesComment", "");
        String additionalComments = (String) body.getOrDefault("additionalComments", "");

        // Satisfaction Status
        String satisfactionStatus = "Neutral";
        if (csatScore != null) {
            if (csatScore >= 4) satisfactionStatus = "Satisfied";
            else if (csatScore <= 2) satisfactionStatus = "Dissatisfied";
        }

        // Complete the database fields
        feedback.setResolutionConfirmed(satisfied);
        feedback.setCsatScore(csatScore);
        feedback.setNpsScore(npsScore);
        feedback.setNpsComment(npsComment);
        feedback.setCesScore(cesScore);
        feedback.setCesComment(cesComment);
        feedback.setAdditionalComments(additionalComments);
        feedback.setSubmittedAt(LocalDateTime.now());
        feedback.setFeedbackSubmittedAt(LocalDateTime.now());
        feedback.setTokenExpired(true);
        feedback.setCustomerSatisfactionStatus(satisfactionStatus);

        if (feedback.getFeedbackRequestSentAt() != null) {
            long diffSeconds = java.time.Duration.between(feedback.getFeedbackRequestSentAt(), LocalDateTime.now()).toSeconds();
            feedback.setFeedbackResponseTime(diffSeconds);
        }

        // Determine if reopening trigger conditions are met:
        // satisfied == false || csatScore == 1 || csatScore == 2
        boolean triggeredReopen = !satisfied || (csatScore != null && csatScore <= 2);

        String ticketId = feedback.getTicketNumber();
        String processInstanceId = feedback.getComplaintId();

        // Find the waiting task in Flowable
        List<Task> tasks = taskService.createTaskQuery()
                .taskDefinitionKey("FormTask_67")
                .includeProcessVariables()
                .list();

        Task targetTask = null;
        for (Task task : tasks) {
            Map<String, Object> vars = taskService.getVariables(task.getId());
            Map<String, Object> complaint = (Map<String, Object>) vars.get("complaint");
            if (complaint != null && ticketId.equals(complaint.get("id"))) {
                targetTask = task;
                break;
            }
        }

        if (targetTask == null) {
            if (processInstanceId != null) {
                targetTask = taskService.createTaskQuery()
                        .processInstanceId(processInstanceId)
                        .taskDefinitionKey("FormTask_67")
                        .singleResult();
            }
        }

        if (targetTask == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "No pending resolution confirmation task found for this complaint."
            ));
        }

        processInstanceId = targetTask.getProcessInstanceId();
        feedback.setComplaintId(processInstanceId);

        // Map variables to complete the task
        Map<String, Object> variables = new java.util.HashMap<>();
        variables.put("isSatisfied", !triggeredReopen);
        variables.put("customerFeedbackComment", additionalComments);
        variables.put("customerFeedbackSubmittedAt", LocalDateTime.now().toString());
        variables.put("csatScore", csatScore);
        variables.put("npsScore", npsScore);
        variables.put("npsComment", npsComment);
        variables.put("cesScore", cesScore);
        variables.put("cesComment", cesComment);

        taskService.complete(targetTask.getId(), variables);

        if (triggeredReopen) {
            feedback.setReopenedCase(true);
            feedback.setReopenCount(feedback.getReopenCount() + 1);

            // Send reopening acknowledgment notification to customer
            try {
                Map<String, Object> customer = (Map<String, Object>) taskService.getVariable(targetTask.getId(), "customer");
                String email = customer != null ? (String) customer.get("email") : null;
                String phone = customer != null ? (String) customer.get("phone") : null;
                String customerName = customer != null ? (String) customer.get("name") : "Valued Customer";
                String preferredLanguage = feedback.getPreferredLanguage() != null ? feedback.getPreferredLanguage() : "english";

                String subject;
                String messageText;
                if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                    subject = "ቅሬታዎ በድጋሚ ተከፍቷል - የቲኬት ቁጥር #" + ticketId;
                    messageText = String.format(
                            "ውድ %s፣\n\n" +
                            "ስለ ቅሬታዎ %s የሰጡንን ምላሽ/ቅሬታ ተቀብለናል።\n\n" +
                            "ቅሬታዎ በራስ-ሰር ተከፍቶ ለሁለተኛ ደረጃ ግምገማ ተላልፏል። አዲስ መፍትሄ ሲሰጥ ወይም ግምገማው ሲጠናቀቅ እናሳውቆታለን።\n\n" +
                            "በመልካም አክብሮት፣\n" +
                            "የደንበኞች አገልግሎት ክፍል\n" +
                            "ዳሽን ባንክ",
                            customerName,
                            ticketId
                    );
                } else {
                    subject = "Complaint Reopened - Ticket #" + ticketId;
                    messageText = String.format(
                            "Dear %s,\n\n" +
                            "We have received your feedback regarding the resolution of complaint %s.\n\n" +
                            "Your complaint has been automatically reopened and escalated for a secondary review. We will contact you once the review is completed.\n\n" +
                            "Best regards,\n" +
                            "Customer Service Team\n" +
                            "Complaint Management System",
                            customerName,
                            ticketId
                    );
                }

                if (email != null && !email.isBlank()) {
                    notificationService.sendEmail(email, subject, messageText);
                }
                if (phone != null && !phone.isBlank()) {
                    notificationService.sendSms(phone, messageText);
                }
            } catch (Exception e) {
                System.err.println("Failed to send reopening notification: " + e.getMessage());
            }

            // A. Update SLA Metrics Status to "Resolution Disputed"
            try {
                var metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
                if (metricsOpt.isPresent()) {
                    var m = metricsOpt.get();
                    m.setStatus("Resolution Disputed");
                    m.setSlaStatus("OVERDUE");
                    m.setBreached(true);
                    slaMetricsRepository.save(m);
                }
            } catch (Exception e) {
                System.err.println("Failed to update SLA Metrics: " + e.getMessage());
            }

            // B. Reopen the Complaint: Auto-complete the new CMD screening task to return it directly to workunit resolution
            try {
                // Find CMD screening task
                List<Task> cmdTasks = taskService.createTaskQuery()
                        .processInstanceId(processInstanceId)
                        .taskDefinitionKey("FormTask_43")
                        .list();
                for (Task cmdTask : cmdTasks) {
                    Map<String, Object> cmdVars = new HashMap<>();
                    cmdVars.put("requiresInvestigation", false);
                    taskService.complete(cmdTask.getId(), cmdVars);
                }
            } catch (Exception e) {
                System.err.println("Failed to auto-route CMD screening: " + e.getMessage());
            }

            // C & E. Create Follow-Up Task: Generate a manual review task "Secondary Resolution Review" for Branch/Department Manager
            try {
                Task reviewTask = taskService.newTask();
                reviewTask.setName("Secondary Resolution Review");
                reviewTask.setDescription("Customer disputed resolution through feedback survey. CSAT: " + csatScore + ", Comments: " + additionalComments);
                
                if (reviewTask instanceof org.flowable.task.service.impl.persistence.entity.TaskEntity) {
                    ((org.flowable.task.service.impl.persistence.entity.TaskEntity) reviewTask).setProcessInstanceId(processInstanceId);
                }
                
                Map<String, Object> vars = runtimeService.getVariables(processInstanceId);
                Map<String, Object> complaintVar = (Map<String, Object>) vars.get("complaint");
                if (complaintVar != null && complaintVar.get("branch") != null) {
                    reviewTask.setCategory("SecondaryResolutionReview");
                    taskService.saveTask(reviewTask);
                    taskService.addCandidateGroup(reviewTask.getId(), "ROLE_BRANCH_STAFF");
                } else {
                    reviewTask.setCategory("SecondaryResolutionReview");
                    taskService.saveTask(reviewTask);
                    taskService.addCandidateGroup(reviewTask.getId(), "ROLE_DEPARTMENT_WORKUNIT");
                }
                
                // Save process variables to the task as well to be safe
                taskService.setVariable(reviewTask.getId(), "complaint", complaintVar);
                taskService.setVariable(reviewTask.getId(), "customer", vars.get("customer"));
                taskService.setVariable(reviewTask.getId(), "csatScore", csatScore);
                taskService.setVariable(reviewTask.getId(), "npsScore", npsScore);
                taskService.setVariable(reviewTask.getId(), "npsComment", npsComment);
                taskService.setVariable(reviewTask.getId(), "cesScore", cesScore);
                taskService.setVariable(reviewTask.getId(), "cesComment", cesComment);
                taskService.setVariable(reviewTask.getId(), "customerFeedbackComment", additionalComments);
                taskService.setVariable(reviewTask.getId(), "preferredLanguage", feedback.getPreferredLanguage());
            } catch (Exception e) {
                System.err.println("Failed to create manager review task: " + e.getMessage());
            }

            // D. Create Audit Log Entry
            auditService.log(ticketId, processInstanceId, null, "CASE_REOPENED_BY_CUSTOMER", "customer", "customer",
                    "Customer disputed resolution through feedback survey. CSAT Score: " + csatScore + ". Complaint automatically reopened for secondary review.");
            auditService.log(ticketId, processInstanceId, null, "RESOLUTION_DISPUTED", "system", "system",
                    "Complaint returned to workunit resolution for Secondary Resolution Review.");
        } else {
            // Case closed normally
            auditService.log(ticketId, processInstanceId, null, "CASE_CLOSED_BY_CUSTOMER", "customer", "customer",
                    "Customer confirmed satisfaction (CSAT: " + csatScore + "). Case closed successfully.");
            try {
                var metricsOpt = slaMetricsRepository.findByProcessInstanceId(processInstanceId);
                if (metricsOpt.isPresent()) {
                    var m = metricsOpt.get();
                    m.setStatus("CLOSED");
                    m.setResolvedAt(LocalDateTime.now());
                    slaMetricsRepository.save(m);
                }
            } catch (Exception e) {
                System.err.println("Failed to close SLA Metrics: " + e.getMessage());
            }
        }

        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "reopened", triggeredReopen,
                "message", triggeredReopen
                        ? "Thank you for your feedback. Your complaint has been returned to the respective Branch/Department manager for a secondary review."
                        : "Thank you! Your case has been successfully closed."
        ));
    }

    @GetMapping("/customer-feedback/analytics")
    public ResponseEntity<?> getFeedbackAnalytics() {
        List<CustomerFeedback> allFeedbacks = feedbackRepository.findAll();
        
        long totalSent = allFeedbacks.size();
        long totalResponses = allFeedbacks.stream().filter(f -> Boolean.TRUE.equals(f.getTokenExpired())).count();
        double responseRate = totalSent > 0 ? (totalResponses * 100.0) / totalSent : 0.0;

        double totalCsat = 0;
        int csatCount = 0;
        double totalNps = 0;
        int npsCount = 0;
        double totalCes = 0;
        int cesCount = 0;
        long confirmedCount = 0;
        long disputedCount = 0;
        long reopenedCount = 0;

        for (var f : allFeedbacks) {
            if (Boolean.TRUE.equals(f.getTokenExpired())) {
                if (f.getCsatScore() != null) {
                    totalCsat += f.getCsatScore();
                    csatCount++;
                }
                if (f.getNpsScore() != null) {
                    totalNps += f.getNpsScore();
                    npsCount++;
                }
                if (f.getCesScore() != null) {
                    totalCes += f.getCesScore();
                    cesCount++;
                }
                if (Boolean.TRUE.equals(f.getResolutionConfirmed())) {
                    confirmedCount++;
                } else if (Boolean.FALSE.equals(f.getResolutionConfirmed())) {
                    disputedCount++;
                }
                if (Boolean.TRUE.equals(f.getReopenedCase())) {
                    reopenedCount++;
                }
            }
        }

        double avgCsat = csatCount > 0 ? totalCsat / csatCount : 0.0;
        double avgNps = npsCount > 0 ? totalNps / npsCount : 0.0;
        double avgCes = cesCount > 0 ? totalCes / cesCount : 0.0;
        double confirmedRate = totalResponses > 0 ? (confirmedCount * 100.0) / totalResponses : 0.0;
        double disputeRate = totalResponses > 0 ? (disputedCount * 100.0) / totalResponses : 0.0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSent", totalSent);
        stats.put("totalResponses", totalResponses);
        stats.put("responseRate", responseRate);
        stats.put("avgCsat", avgCsat);
        stats.put("avgNps", avgNps);
        stats.put("avgCes", avgCes);
        stats.put("confirmationRate", confirmedRate);
        stats.put("disputeRate", disputeRate);
        stats.put("reopenedCount", reopenedCount);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/customer-feedback/distributions")
    public ResponseEntity<?> getFeedbackDistributions() {
        List<CustomerFeedback> allFeedbacks = feedbackRepository.findAll();
        
        Map<Integer, Long> csatMap = new HashMap<>();
        for (int i = 1; i <= 5; i++) csatMap.put(i, 0L);
        
        Map<Integer, Long> npsMap = new HashMap<>();
        for (int i = 0; i <= 10; i++) npsMap.put(i, 0L);
        
        Map<Integer, Long> cesMap = new HashMap<>();
        for (int i = 1; i <= 7; i++) cesMap.put(i, 0L);

        for (var f : allFeedbacks) {
            if (Boolean.TRUE.equals(f.getTokenExpired())) {
                if (f.getCsatScore() != null && csatMap.containsKey(f.getCsatScore())) {
                    csatMap.put(f.getCsatScore(), csatMap.get(f.getCsatScore()) + 1);
                }
                if (f.getNpsScore() != null && npsMap.containsKey(f.getNpsScore())) {
                    npsMap.put(f.getNpsScore(), npsMap.get(f.getNpsScore()) + 1);
                }
                if (f.getCesScore() != null && cesMap.containsKey(f.getCesScore())) {
                    cesMap.put(f.getCesScore(), cesMap.get(f.getCesScore()) + 1);
                }
            }
        }

        List<Map<String, Object>> csatList = csatMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("label", e.getKey().toString(), "count", e.getValue()))
                .toList();

        List<Map<String, Object>> npsList = npsMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("label", e.getKey().toString(), "count", e.getValue()))
                .toList();

        List<Map<String, Object>> cesList = cesMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("label", e.getKey().toString(), "count", e.getValue()))
                .toList();

        return ResponseEntity.ok(Map.of(
            "csat", csatList,
            "nps", npsList,
            "ces", cesList
        ));
    }

    @GetMapping("/customer-feedback/trends")
    public ResponseEntity<?> getFeedbackTrends() {
        List<CustomerFeedback> allFeedbacks = feedbackRepository.findAll();
        
        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM");
        
        Map<String, List<CustomerFeedback>> grouped = allFeedbacks.stream()
                .filter(f -> Boolean.TRUE.equals(f.getTokenExpired()) && f.getSubmittedAt() != null)
                .collect(Collectors.groupingBy(f -> f.getSubmittedAt().format(formatter)));

        List<Map<String, Object>> trend = grouped.entrySet().stream()
                .map(e -> {
                    String month = e.getKey();
                    List<CustomerFeedback> list = e.getValue();
                    double avgCsat = list.stream().filter(f -> f.getCsatScore() != null).mapToInt(f -> f.getCsatScore()).average().orElse(0.0);
                    double avgNps = list.stream().filter(f -> f.getNpsScore() != null).mapToInt(f -> f.getNpsScore()).average().orElse(0.0);
                    double avgCes = list.stream().filter(f -> f.getCesScore() != null).mapToInt(f -> f.getCesScore()).average().orElse(0.0);
                    
                    Map<String, Object> m = new HashMap<>();
                    m.put("period", month);
                    m.put("avgCsat", avgCsat);
                    m.put("avgNps", avgNps);
                    m.put("avgCes", avgCes);
                    m.put("count", (long) list.size());
                    return m;
                })
                .sorted(Comparator.comparing(m -> m.get("period").toString()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(trend);
    }

    @GetMapping("/customer-feedback/list")
    public ResponseEntity<?> getFeedbackList(@RequestParam(required = false) String query) {
        List<CustomerFeedback> list = feedbackRepository.findAll();
        if (query != null && !query.isBlank()) {
            final String q = query.toLowerCase().trim();
            list = list.stream()
                    .filter(f -> f.getTicketNumber().toLowerCase().contains(q) || (f.getComplaintId() != null && f.getComplaintId().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(list);
    }
}
