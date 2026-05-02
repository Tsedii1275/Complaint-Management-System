package com.example.flowable_demo.controller;

import com.example.flowable_demo.service.NotificationService;
import org.flowable.engine.HistoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ProcessController {

    @Autowired
    private RuntimeService runtimeService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private HistoryService historyService;

    @Autowired
    private NotificationService notificationService;

    @PostMapping("/complaints/start")
    public ResponseEntity<Map<String, Object>> startComplaint(
            @RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request body is required and must be valid JSON"));
        }
        Map<String, Object> customer = (Map<String, Object>) payload.get("customer");
        Map<String, Object> complaint = (Map<String, Object>) payload.get("complaint");

        if (customer == null || complaint == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer and complaint objects are required"));
        }

        String name = (String) customer.get("name");
        String email = (String) customer.get("email");
        String phone = (String) customer.get("phone");
        String accountNumber = (String) customer.get("accountNumber");
        String channel = (String) complaint.get("channel");
        String description = (String) complaint.get("description");

        if (name == null || name.isBlank() || email == null || email.isBlank() || phone == null
                || phone.isBlank() || channel == null || channel.isBlank() || description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All required fields must be filled"));
        }
        if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid email format"));
        }
        if (!phone.matches("^\\+2519\\d{8}$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid phone format; expected +2519XXXXXXXX"));
        }

        Map<String, Object> vars = new HashMap<>();

        Map<String, Object> customerVars = new HashMap<>();
        customerVars.put("name", name);
        customerVars.put("email", email);
        customerVars.put("phone", phone);
        customerVars.put("accountNumber", accountNumber != null && !accountNumber.isBlank() ? accountNumber : "");

        Map<String, Object> complaintVars = new HashMap<>();
        complaintVars.put("channel", channel);
        complaintVars.put("description", description);

        // Generate ticket immediately
        String ticket = "CM-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 8);
        complaintVars.put("id", ticket);

        vars.put("customer", customerVars);
        vars.put("complaint", complaintVars);
        vars.put("initiator", "initiator");
        vars.put("createdAt", java.time.LocalDateTime.now().toString());

        // Send "Complaint Registered Successfully" notification immediately on submission
        try {
            String emailMessage = String.format(
                "Dear %s,\n\n" +
                "Your complaint has been registered successfully.\n\n" +
                "Ticket Number: %s\n" +
                "Registration Date: %s\n\n" +
                "Our team will review your complaint shortly.\n\n" +
                "Best regards,\n" +
                "Customer Service Team",
                name,
                ticket,
                java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a"))
            );
            notificationService.sendEmail(email, "Complaint Registered - Ticket #" + ticket, emailMessage);
            notificationService.sendSms(phone, "Your complaint ticket " + ticket + " has been registered. We will keep you updated.");
            vars.put("notification.ticketEmailSent", true);
            vars.put("notification.ticketSmsSent", true);
        } catch (Exception e) {
            System.err.println("Failed to send registration notification: " + e.getMessage());
            vars.put("notification.ticketEmailSent", false);
            vars.put("notification.ticketSmsSent", false);
        }

        var instance = runtimeService.startProcessInstanceByKey("cMS", vars);

        Map<String, Object> response = new HashMap<>();
        response.put("processInstanceId", instance.getId());
        response.put("businessKey", instance.getBusinessKey());
        response.put("completed", instance.isEnded());
        response.put("ticketId", ticket);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<Map<String, Object>>> findTasks(
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String candidateGroup) {

        List<Task> tasks;
        if (assignee != null && !assignee.isBlank()) {
            tasks = taskService.createTaskQuery().taskAssignee(assignee).list();
        } else if (candidateGroup != null && !candidateGroup.isBlank()) {
            tasks = taskService.createTaskQuery().taskCandidateGroup(candidateGroup).list();
        } else {
            tasks = taskService.createTaskQuery().list();
        }

        var result = tasks.stream().map(task -> Map.<String, Object>of(
                "id", task.getId(),
                "name", task.getName(),
                "assignee", task.getAssignee(),
                "processInstanceId", task.getProcessInstanceId(),
                "taskDefinitionKey", task.getTaskDefinitionKey())).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/tasks/enriched")
    public ResponseEntity<List<Map<String, Object>>> findTasksEnriched(
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String candidateGroup,
            @RequestParam(required = false) String slaFilter,
            @RequestParam(required = false) String priorityFilter,
            @RequestParam(required = false) String stateFilter) {

        List<Task> tasks;
        if (assignee != null && !assignee.isBlank()) {
            tasks = taskService.createTaskQuery().taskAssignee(assignee).list();
        } else if (candidateGroup != null && !candidateGroup.isBlank()) {
            tasks = taskService.createTaskQuery().taskCandidateGroup(candidateGroup).list();
        } else {
            tasks = taskService.createTaskQuery().list();
        }

        var enriched = tasks.stream().map(task -> {
            Map<String, Object> vars = taskService.getVariables(task.getId());
            Map<String, Object> customer = (Map<String, Object>) vars.getOrDefault("customer", Map.of());
            Map<String, Object> complaint = (Map<String, Object>) vars.getOrDefault("complaint", Map.of());
            Map<String, Object> sla = (Map<String, Object>) vars.getOrDefault("sla", Map.of());

            String deadline = sla.getOrDefault("deadline", "").toString();
            boolean breached = Boolean.parseBoolean(sla.getOrDefault("breached", "false").toString());
            String slaStatus = breached ? "BREACHED" : "ACTIVE";
            if (!deadline.isBlank()) {
                try {
                    LocalDateTime deadlineDate = LocalDateTime.parse(deadline);
                    Duration diff = Duration.between(LocalDateTime.now(), deadlineDate);
                    if (!breached && !diff.isNegative()) {
                        if (diff.toHours() < 24)
                            slaStatus = "APPROACHING";
                        else
                            slaStatus = "ON_TIME";
                    }
                    if (diff.isNegative())
                        slaStatus = "BREACHED";
                } catch (Exception ignored) {
                }
            }

            String customerName = customer.getOrDefault("name", "").toString();
            String complaintId = complaint.getOrDefault("id", "").toString();
            String priority = complaint.getOrDefault("priority", "").toString();
            String state = task.getName();
            String createdAt = task.getCreateTime() != null
                    ? DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(
                            task.getCreateTime().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime())
                    : "";

            Map<String, Object> notification = new HashMap<>();
            notification.put("ticketEmailSent", vars.getOrDefault("notification.ticketEmailSent", false));
            notification.put("ticketSmsSent", vars.getOrDefault("notification.ticketSmsSent", false));
            notification.put("resolutionEmailSent", vars.getOrDefault("notification.resolutionEmailSent", false));
            notification.put("resolutionSmsSent", vars.getOrDefault("notification.resolutionSmsSent", false));

            String candidateGroupValue = "";

            Map<String, Object> enrichedTask = new HashMap<>();
            enrichedTask.put("id", task.getId());
            enrichedTask.put("name", task.getName());
            enrichedTask.put("assignee", task.getAssignee());
            enrichedTask.put("candidateGroup", candidateGroupValue);
            enrichedTask.put("processInstanceId", task.getProcessInstanceId());
            enrichedTask.put("definitionKey", task.getTaskDefinitionKey());
            enrichedTask.put("complaintId", complaintId);
            enrichedTask.put("customerName", customerName);
            enrichedTask.put("priority", priority);
            enrichedTask.put("slaStatus", slaStatus);
            enrichedTask.put("state", state);
            enrichedTask.put("createdAt", createdAt);
            enrichedTask.put("notification", notification);
            enrichedTask.put("variables", vars);
            return enrichedTask;
        }).collect(Collectors.toList());

        List<Map<String, Object>> filtered = enriched.stream()
                .filter(r -> slaFilter == null || slaFilter.isBlank()
                        || slaFilter.equalsIgnoreCase(String.valueOf(r.get("slaStatus"))))
                .filter(r -> priorityFilter == null || priorityFilter.isBlank()
                        || priorityFilter.equalsIgnoreCase(String.valueOf(r.get("priority"))))
                .filter(r -> stateFilter == null || stateFilter.isBlank()
                        || String.valueOf(r.get("state")).equalsIgnoreCase(stateFilter))
                .collect(Collectors.toList());

        return ResponseEntity.ok(filtered);
    }

    @GetMapping("/tasks/{taskId}/variables")
    public ResponseEntity<Map<String, Object>> getTaskVariables(@PathVariable String taskId) {
        Map<String, Object> vars = taskService.getVariables(taskId);
        return ResponseEntity.ok(vars);
    }

    @PostMapping("/tasks/{taskId}/claim")
    public ResponseEntity<Map<String, String>> claimTask(@PathVariable String taskId,
            @RequestBody Map<String, String> body) {
        String userId = body.get("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
        }

        taskService.claim(taskId, userId);
        return ResponseEntity.ok(Map.of("taskId", taskId, "assignee", userId));
    }

    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<Map<String, Object>> completeTask(@PathVariable String taskId,
            @RequestBody Map<String, Object> body) {
        Map<String, Object> variables = (Map<String, Object>) body.get("variables");
        if (variables == null) {
            variables = Map.of();
        }

        taskService.complete(taskId, variables);
        return ResponseEntity.ok(Map.of("taskId", taskId, "completed", true));
    }

    @GetMapping("/process/{instanceId}")
    public ResponseEntity<Map<String, Object>> getProcess(@PathVariable String instanceId) {
        var processInstance = runtimeService.createProcessInstanceQuery().processInstanceId(instanceId).singleResult();
        var history = historyService.createHistoricTaskInstanceQuery().processInstanceId(instanceId).list();

        Map<String, Object> payload = Map.of(
                "id", instanceId,
                "isActive", processInstance != null,
                "historyTaskCount", history.size());

        return ResponseEntity.ok(payload);
    }
}
