package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.AuditLog;
import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.model.Customer;
import com.example.flowable_demo.repository.CustomerRepository;
import com.example.flowable_demo.service.AuditService;
import com.example.flowable_demo.service.NotificationService;
import com.example.flowable_demo.service.SlaTrackingService;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

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

    @Autowired
    private AuditService auditService;

    @Autowired
    private SlaTrackingService slaTrackingService;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private com.example.flowable_demo.repository.UserRepository userRepository;

    @PostMapping("/complaints/start")
    public ResponseEntity<Map<String, Object>> startComplaint(
            @RequestBody(required = false) Map<String, Object> payload) {
        return startComplaintInternal(payload, false);
    }

    private ResponseEntity<Map<String, Object>> startComplaintInternal(
            Map<String, Object> payload, boolean skipNotification) {
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
        String category = (String) complaint.get("category");

        if (name == null || name.isBlank() || email == null || email.isBlank() || phone == null
                || phone.isBlank() || channel == null || channel.isBlank() || description == null
                || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "All required fields must be filled"));
        }
        if (!email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid email format"));
        }
        if (!phone.matches("^\\+2510?9\\d{8}$")) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid phone format; expected +2519XXXXXXXX or +25109XXXXXXXX"));
        }

        Map<String, Object> vars = new HashMap<>();

        Map<String, Object> customerVars = new HashMap<>();
        customerVars.put("name", name);
        customerVars.put("email", email);
        customerVars.put("phone", phone);
        customerVars.put("accountNumber", accountNumber != null && !accountNumber.isBlank() ? accountNumber : "");

        String preferredContactMethod = (String) customer.get("preferredContactMethod");
        customerVars.put("preferredContactMethod",
                preferredContactMethod != null && !preferredContactMethod.isBlank() ? preferredContactMethod : "Email");

        String preferredLanguage = (String) customer.get("preferredLanguage");
        customerVars.put("preferredLanguage",
                preferredLanguage != null && !preferredLanguage.isBlank() ? preferredLanguage : "english");

        // Simulate CRM/Core banking database lookup
        Customer dbCustomer = null;
        if (accountNumber != null && !accountNumber.isBlank()) {
            dbCustomer = customerRepository.findByAccountNumber(accountNumber.trim()).orElse(null);
        }

        if (dbCustomer != null) {
            customerVars.put("customerSegment", dbCustomer.getCustomerSegment() != null ? dbCustomer.getCustomerSegment() : "Retail");
            customerVars.put("customerSubSegment", dbCustomer.getCustomerSubSegment() != null ? dbCustomer.getCustomerSubSegment() : "Standard");
            customerVars.put("riskRating", dbCustomer.getRiskRating() != null ? dbCustomer.getRiskRating() : "LOW");
            customerVars.put("isVip", dbCustomer.isVip());
            // Use CRM name/email/phone as golden record if matching
            customerVars.put("name", dbCustomer.getName());
            customerVars.put("email", dbCustomer.getEmail());
            customerVars.put("phone", dbCustomer.getPhoneNumber());
        } else {
            // Default Retail customer segmentations
            customerVars.put("customerSegment", "Retail");
            customerVars.put("customerSubSegment", "Standard");
            customerVars.put("riskRating", "LOW");
            customerVars.put("isVip", false);
        }

        Map<String, Object> complaintVars = new HashMap<>();
        complaintVars.put("channel", channel);
        complaintVars.put("description", description);
        complaintVars.put("category", category);
        if (complaint.get("branch") != null) {
            complaintVars.put("branch", complaint.get("branch"));
        }
        if (complaint.get("date") != null) {
            complaintVars.put("date", complaint.get("date"));
        }
        if (complaint.get("voiceAttachmentUrl") != null) {
            complaintVars.put("voiceAttachmentUrl", complaint.get("voiceAttachmentUrl"));
        }
        if (complaint.get("voiceAttachmentName") != null) {
            complaintVars.put("voiceAttachmentName", complaint.get("voiceAttachmentName"));
        }
        if (complaint.get("evidenceUrl") != null) {
            complaintVars.put("evidenceUrl", complaint.get("evidenceUrl"));
        }
        if (complaint.get("evidenceName") != null) {
            complaintVars.put("evidenceName", complaint.get("evidenceName"));
        }

        // Generate ticket immediately
        String ticket = "CM-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 8);
        complaintVars.put("id", ticket);

        vars.put("customer", customerVars);
        vars.put("complaint", complaintVars);
        vars.put("initiator", "initiator");
        vars.put("createdAt", java.time.LocalDateTime.now().toString());
        // Store channel as top-level so BPMN gateway conditionExpressions can evaluate
        // it
        vars.put("channel", channel);
        vars.put("preferredLanguage", preferredLanguage != null && !preferredLanguage.isBlank() ? preferredLanguage : "english");

        // Send "Complaint Registered Successfully" notification immediately on
        // submission
        if (!skipNotification) {
            try {
                String emailMessage;
                String smsMessage;
                String subject;
                if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                    subject = "ቅሬታዎ ተመዝግቧል - የቲኬት ቁጥር #" + ticket;
                    emailMessage = String.format(
                            "ውድ %s፣\n\n" +
                            "ቅሬታዎ በተሳካ ሁኔታ ተመዝግቧል።\n\n" +
                            "የቅሬታ ቁጥር: %s\n" +
                            "የተመዘገበበት ቀን: %s\n\n" +
                            "ቅሬታዎን ደርሶናል፤ ቡድናችን በቅርቡ ይመረምረዋል።\n\n" +
                            "በመልካም አክብሮት፣\n" +
                            "የደንበኞች አገልግሎት ክፍል\n" +
                            "ዳሽን ባንክ",
                            name,
                            ticket,
                            java.time.LocalDateTime.now()
                                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                    );
                    smsMessage = String.format(
                            "ቅሬታዎ በቁጥር %s በተሳካ ሁኔታ ተመዝግቧል። በሂደቱ ላይ መረጃ እንሰጥዎታለን።",
                            ticket
                    );
                } else {
                    subject = "Complaint Registered - Ticket #" + ticket;
                    emailMessage = String.format(
                            "Dear %s,\n\n" +
                            "Your complaint has been registered successfully.\n\n" +
                            "Ticket Number: %s\n" +
                            "Registration Date: %s\n\n" +
                            "Our team will review your complaint shortly.\n\n" +
                            "Best regards,\n" +
                            "Customer Service Team",
                            name,
                            ticket,
                            java.time.LocalDateTime.now()
                                    .format(DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a"))
                    );
                    smsMessage = "Your complaint ticket " + ticket + " has been registered. We will keep you updated.";
                }
                notificationService.sendEmail(email, subject, emailMessage);
                notificationService.sendSms(phone, smsMessage);
                vars.put("notification.ticketEmailSent", true);
                vars.put("notification.ticketSmsSent", true);
            } catch (Exception e) {
                System.err.println("Failed to send registration notification: " + e.getMessage());
                vars.put("notification.ticketEmailSent", false);
                vars.put("notification.ticketSmsSent", false);
            }
        }

        var instance = runtimeService.startProcessInstanceByKey("cMS", vars);

        // Initialize SLA tracking
        try {
            String customerName = (String) customerVars.get("name");
            String branchVal = (String) complaintVars.get("branch");
            slaTrackingService.initializeSla(instance.getId(), ticket, category, branchVal, channel, customerName);
            // Record start time for the first task
            List<Task> initialTasks = taskService.createTaskQuery()
                    .processInstanceId(instance.getId()).list();
            for (Task t : initialTasks) {
                slaTrackingService.recordTaskStart(instance.getId(), ticket,
                        t.getId(), t.getTaskDefinitionKey(), t.getName(), t.getAssignee());
            }
        } catch (Exception e) {
            System.err.println("SLA tracking initialization failed: " + e.getMessage());
        }

        // Log audit event
        auditService.log(ticket, instance.getId(), null, "COMPLAINT_CREATED", "customer", "web",
                "New complaint submitted by " + name + " via web channel.", name, email, category, description);

        Map<String, Object> response = new HashMap<>();
        response.put("processInstanceId", instance.getId());
        response.put("businessKey", instance.getBusinessKey());
        response.put("completed", instance.isEnded());
        response.put("ticketId", ticket);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complaints/staff-submit")
    public ResponseEntity<Map<String, Object>> startComplaintByStaff(
            @RequestBody(required = false) Map<String, Object> payload) {
        return startComplaintInternal(payload, false);
    }

    @PostMapping("/complaints/fcr-resolve")
    public ResponseEntity<Map<String, Object>> fcrResolveComplaint(
            @RequestBody(required = false) Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request body is required"));
        }
        Map<String, Object> customer = (Map<String, Object>) payload.get("customer");
        Map<String, Object> complaint = (Map<String, Object>) payload.get("complaint");

        if (customer == null || complaint == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "customer and complaint objects are required"));
        }

        String name = (String) customer.get("name");
        String email = (String) customer.getOrDefault("email", "");
        String phone = (String) customer.get("phone");
        String accountNumber = (String) customer.getOrDefault("accountNumber", "");
        String channel = (String) complaint.getOrDefault("channel", "branch");
        String description = (String) complaint.get("description");
        String category = (String) complaint.get("category");
        String resolutionNotes = (String) complaint.getOrDefault("resolutionNotes", "");
        String branch = (String) complaint.getOrDefault("branch", "");
        String preferredLanguage = (String) customer.getOrDefault("preferredLanguage", "english");

        if (name == null || name.isBlank() || description == null || description.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Customer name and complaint description are required"));
        }

        // Generate ticket
        String ticket = "CM-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 8);

        String actor = getCurrentUsername();

        // Log FCR_RESOLVED to audit
        String fullDescription = String.format(
                "Complaint resolved at First Contact Resolution by branch staff. Resolution Notes: %s",
                resolutionNotes.isBlank() ? "No additional notes provided." : resolutionNotes);
        auditService.log(ticket, null, null, "FCR_RESOLVED", "branch-staff", actor,
                fullDescription, name, email, category, description);

        // Also log CASE_CLOSED immediately
        auditService.log(ticket, null, null, "CASE_CLOSED", "system", "system",
                "Case closed at first contact resolution. No further escalation required.", name, email, category,
                description);

        // Initialize FCR SLA Entry
        try {
            slaTrackingService.initializeFcrSla(ticket, category, branch, name, channel);
        } catch (Exception e) {
            System.err.println("FCR SLA initialization failed: " + e.getMessage());
        }

        // Send notification if email present
        if (email != null && !email.isBlank() && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
            try {
                String emailMessage;
                String subject;
                if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                    subject = "ቅሬታዎ ተፈትቷል - የቲኬት ቁጥር #" + ticket;
                    emailMessage = String.format(
                            "ውድ %s፣\n\n" +
                            "ቅሬታዎ በቅርንጫፋችን ተመዝግቦ ተፈትቷል።\n\n" +
                            "የቅሬታ ቁጥር: %s\n" +
                            "የተፈታበት ቀን: %s\n" +
                            "የ%s\n\n" +
                            "ተጨማሪ ጥያቄ ካለዎት እባክዎ እኛን ለማነጋገር አያመንቱ።\n\n" +
                            "በመልካም አክብሮት፣\n" +
                            "የደንበኞች አገልግሎት ክፍል\n" +
                            "ዳሽን ባንክ",
                            name, ticket,
                            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                            resolutionNotes.isBlank() ? "መፍትሄ: በቅርንጫፍ ተፈትቷል።" : "መፍትሄ: " + resolutionNotes);
                } else {
                    subject = "Complaint Resolved - Ticket #" + ticket;
                    emailMessage = String.format(
                            "Dear %s,\n\n" +
                            "Your complaint has been registered and resolved at our branch.\n\n" +
                            "Ticket Number: %s\n" +
                            "Resolution Date: %s\n\n" +
                            "Resolution Notes: %s\n\n" +
                            "If you have any further concerns, please do not hesitate to contact us.\n\n" +
                            "Best regards,\n" +
                            "Customer Service Team",
                            name, ticket,
                            LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a")),
                            resolutionNotes.isBlank() ? "Resolved at branch." : resolutionNotes);
                }
                notificationService.sendEmail(email, subject, emailMessage);
            } catch (Exception e) {
                System.err.println("FCR notification failed: " + e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("ticketId", ticket);
        response.put("fcrResolved", true);
        response.put("message", "Complaint resolved at First Contact Resolution and case closed.");
        return ResponseEntity.ok(response);
    }

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetails) {
            return ((UserDetails) auth.getPrincipal()).getUsername();
        }
        return auth != null ? auth.getName() : "system";
    }

    private String getCurrentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && !auth.getAuthorities().isEmpty()) {
            return auth.getAuthorities().iterator().next().getAuthority();
        }
        return "ROLE_ANONYMOUS";
    }

    private java.util.Set<String> mapRoleToTaskDefinitionKeys(String role) {
        return switch (role) {
            case "ROLE_BRANCH_STAFF" ->
                java.util.Set.of("FormTask_16", "FormTask_24", "FormTask_20", "FormTask_67", "FormTask_12");
            case "ROLE_CMD_OFFICER" -> java.util.Set.of("FormTask_43");
            case "ROLE_AUDIT_TEAM" -> java.util.Set.of("FormTask_48");
            case "ROLE_DEPARTMENT_WORKUNIT" -> java.util.Set.of("FormTask_57");
            case "ROLE_SERVICE_QUALITY" -> java.util.Set.of("ServiceTask_65");
            case "ROLE_CHIEF_COMMITTEE" -> java.util.Set.of("FormTask_ChiefCommittee");
            default -> java.util.Set.of();
        };
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

        var result = tasks.stream().map(task -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", task.getId());
            map.put("name", task.getName());
            map.put("assignee", task.getAssignee());
            map.put("processInstanceId", task.getProcessInstanceId());
            map.put("taskDefinitionKey", task.getTaskDefinitionKey());
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/tasks/enriched")
    public ResponseEntity<List<Map<String, Object>>> findTasksEnriched(
            @RequestParam(required = false) String assignee,
            @RequestParam(required = false) String candidateGroup,
            @RequestParam(required = false) String slaFilter,
            @RequestParam(required = false) String priorityFilter,
            @RequestParam(required = false) String stateFilter) {

        String role = getCurrentUserRole();
        java.util.Set<String> allowedKeys = mapRoleToTaskDefinitionKeys(role);

        List<Task> tasks;
        var query = taskService.createTaskQuery();

        if (assignee != null && !assignee.isBlank()) {
            query = query.taskAssignee(assignee);
        } else if (candidateGroup != null && !candidateGroup.isBlank()) {
            query = query.taskCandidateGroup(candidateGroup);
        }

        tasks = query.list();

        if (assignee == null && candidateGroup == null && !allowedKeys.isEmpty()) {
            tasks = tasks.stream()
                    .filter(t -> {
                        String key = t.getTaskDefinitionKey();
                        if (key == null) {
                            if ("SecondaryResolutionReview".equals(t.getCategory())) {
                                return "ROLE_BRANCH_STAFF".equals(role) || "ROLE_DEPARTMENT_WORKUNIT".equals(role);
                            }
                            return false;
                        }
                        return allowedKeys.contains(key);
                    })
                    .collect(Collectors.toList());
        }

        Map<String, Map<String, Object>> taskVarsCache = new HashMap<>();
        for (org.flowable.task.api.Task t : tasks) {
            try {
                taskVarsCache.put(t.getId(), taskService.getVariables(t.getId()));
            } catch (Exception e) {
                taskVarsCache.put(t.getId(), new HashMap<>());
            }
        }

        String currentUsername = getCurrentUsername();
        com.example.flowable_demo.model.User currentUser = userRepository.findByUsernameIgnoreCase(currentUsername).orElse(null);
        if (currentUser != null) {
            String uBranch = currentUser.getBranch();
            String uDept = currentUser.getDepartment();
            if ("ROLE_BRANCH_STAFF".equals(role) && uBranch != null && !uBranch.isBlank()) {
                tasks = tasks.stream()
                        .filter(t -> {
                            Map<String, Object> vars = taskVarsCache.getOrDefault(t.getId(), Map.of());
                            String tBranch = (String) vars.get("branch");
                            return tBranch == null || uBranch.equalsIgnoreCase(tBranch);
                        })
                        .collect(Collectors.toList());
            } else if ("ROLE_DEPARTMENT_WORKUNIT".equals(role)) {
                tasks = tasks.stream()
                        .filter(t -> {
                            Map<String, Object> vars = taskVarsCache.getOrDefault(t.getId(), Map.of());
                            String tBranch = (String) vars.get("branch");
                            String tDept = (String) vars.get("department");
                            boolean matchBranch = uBranch == null || uBranch.isBlank() || uBranch.equalsIgnoreCase(tBranch);
                            boolean matchDept = uDept == null || uDept.isBlank() || uDept.equalsIgnoreCase(tDept);
                            return matchBranch && matchDept;
                        })
                        .collect(Collectors.toList());
            }
        }

        List<Map<String, Object>> enriched = tasks.stream().map(task -> {
            Map<String, Object> vars = taskVarsCache.getOrDefault(task.getId(), Map.of());
            Map<String, Object> customer = (Map<String, Object>) vars.getOrDefault("customer", Map.of());
            Map<String, Object> complaint = (Map<String, Object>) vars.getOrDefault("complaint", Map.of());
            Map<String, Object> sla = (Map<String, Object>) vars.getOrDefault("sla", Map.of());
            String deadline = sla.getOrDefault("deadline", "").toString();
            String slaStatus = "ON_TIME";
            if ("FormTask_43".equals(task.getTaskDefinitionKey())
                    || "FormTask_48".equals(task.getTaskDefinitionKey())) {
                if (task.getCreateTime() != null) {
                    LocalDateTime createTime = task.getCreateTime().toInstant().atZone(java.time.ZoneId.systemDefault())
                            .toLocalDateTime();
                    LocalDateTime taskDeadline = createTime.plusSeconds(30);
                    Duration diff = Duration.between(LocalDateTime.now(), taskDeadline);
                    boolean processSlaBreached = Boolean.parseBoolean(sla.getOrDefault("breached", "false").toString());
                    if (processSlaBreached || diff.isNegative()) {
                        slaStatus = "OVERDUE";
                    } else if (diff.toSeconds() <= 10) {
                        slaStatus = "APPROACHING";
                    } else {
                        slaStatus = "ON_TIME";
                    }
                }
            } else {
                boolean breached = Boolean.parseBoolean(sla.getOrDefault("breached", "false").toString());
                slaStatus = breached ? "OVERDUE" : "ON_TIME";
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
                            slaStatus = "OVERDUE";
                    } catch (Exception ignored) {
                    }
                }
            }

            String customerName = customer.getOrDefault("name", "").toString();
            String complaintId = complaint.getOrDefault("id", "").toString();
            String priority = complaint.getOrDefault("priority", "").toString();
            if (vars.containsKey("priorityLevel")) {
                priority = vars.get("priorityLevel").toString();
            }
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

            boolean isClaimed = task.getAssignee() != null && !task.getAssignee().isBlank() && !"initiator".equalsIgnoreCase(task.getAssignee());
            Map<String, Object> enrichedTask = new HashMap<>();
            enrichedTask.put("id", task.getId());
            enrichedTask.put("name", task.getName());
            enrichedTask.put("assignee", task.getAssignee());
            enrichedTask.put("isClaimed", isClaimed);
            enrichedTask.put("claimedBy", task.getAssignee());
            enrichedTask.put("claimedAt", task.getCreateTime() != null ? createdAt : null);
            enrichedTask.put("candidateGroup", candidateGroupValue);
            enrichedTask.put("processInstanceId", task.getProcessInstanceId());
            enrichedTask.put("definitionKey", task.getTaskDefinitionKey());
            enrichedTask.put("complaintId", complaintId);
            enrichedTask.put("customerName", customerName);
            enrichedTask.put("priority", priority);
            enrichedTask.put("slaStatus", slaStatus);
            enrichedTask.put("responseSlaStatus", isClaimed ? "ON_TIME" : "UNCLAIMED");
            enrichedTask.put("resolutionSlaStatus", slaStatus);
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
    public ResponseEntity<Map<String, Object>> claimTask(@PathVariable String taskId) {
        String username = getCurrentUsername();
        org.flowable.task.api.Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            taskService.setAssignee(taskId, username);
        } catch (Exception e) {
            try {
                taskService.claim(taskId, username);
            } catch (Exception ex) {
                System.err.println("Claim info: " + ex.getMessage());
            }
        }

        String procInstId = task.getProcessInstanceId();
        Map<String, Object> vars = new HashMap<>();
        try {
            vars = taskService.getVariables(taskId);
        } catch (Exception ignored) {}
        Map<String, Object> complaint = (Map<String, Object>) vars.getOrDefault("complaint", Map.of());
        String ticketId = complaint.getOrDefault("id", taskId).toString();

        com.example.flowable_demo.model.TaskTimeTracking tracking = null;
        try {
            tracking = slaTrackingService.recordTaskClaim(taskId, username, procInstId, ticketId, task.getTaskDefinitionKey(), task.getName());
        } catch (Exception e) {
            System.err.println("Failed to record task claim: " + e.getMessage());
        }

        try {
            auditService.log(ticketId, procInstId, taskId, "TASK_CLAIMED", "staff", username,
                    "Task '" + task.getName() + "' claimed by " + username + ".", "", "", "", "");
        } catch (Exception e) {
            System.err.println("Audit log failed for claim: " + e.getMessage());
        }

        Map<String, Object> res = new HashMap<>();
        res.put("taskId", taskId);
        res.put("assignee", username);
        res.put("isClaimed", true);
        res.put("claimedBy", username);
        res.put("claimedAt", tracking != null && tracking.getClaimedAt() != null ? tracking.getClaimedAt().toString() : LocalDateTime.now().toString());
        if (tracking != null) {
            res.put("responseTimeMinutes", tracking.getResponseTimeMinutes());
            res.put("responseSlaStatus", tracking.getResponseSlaStatus());
        }
        return ResponseEntity.ok(res);
    }

    @GetMapping("/complaints/{complaintId}/timeline")
    public ResponseEntity<List<com.example.flowable_demo.model.TaskTimeTracking>> getComplaintSlaTimeline(@PathVariable String complaintId) {
        List<com.example.flowable_demo.model.TaskTimeTracking> timeline = slaTrackingService.getStageTimeline(complaintId);
        return ResponseEntity.ok(timeline);
    }

    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<Map<String, Object>> completeTask(@PathVariable String taskId,
            @RequestBody Map<String, Object> body) {
        try {
            // Handle both nested and top-level variables
            Map<String, Object> variables;
            if (body.containsKey("variables") && body.get("variables") instanceof Map) {
                variables = new java.util.HashMap<>((Map<String, Object>) body.get("variables"));
            } else {
                variables = new java.util.HashMap<>(body);
            }

            Task task = taskService.createTaskQuery().taskId(taskId).singleResult();
            if (task == null) {
                return ResponseEntity.status(404)
                        .body(Map.of("error", "Task not found", "taskId", taskId));
            }

            Map<String, Object> vars = taskService.getVariables(taskId);
            Map<String, Object> complaint = (Map<String, Object>) vars.get("complaint");
            Map<String, Object> customer = (Map<String, Object>) vars.get("customer");

            String ticketId = complaint != null ? (String) complaint.get("id") : "unknown";
            String cat = complaint != null ? (String) complaint.get("category") : null;
            String desc = complaint != null ? (String) complaint.get("description") : null;
            String cName = customer != null ? (String) customer.get("name") : null;
            String cEmail = customer != null ? (String) customer.get("email") : null;

            String action = "TASK_COMPLETED";
            String actor = "staff";
            String description = "Task '" + task.getName() + "' completed.";

            // Extract comments if any
            if (variables.containsKey("fcrComments") && variables.get("fcrComments") != null
                    && !variables.get("fcrComments").toString().isBlank()) {
                description += " Comment: " + variables.get("fcrComments");
            } else if (variables.containsKey("notes") && variables.get("notes") != null
                    && !variables.get("notes").toString().isBlank()) {
                description += " Notes: " + variables.get("notes");
            }
            if (variables.containsKey("complaintCategory")) {
                description += " [Assigned Category: " + variables.get("complaintCategory") + "]";
            }

            // Map specific tasks to actions
            String defKey = task.getTaskDefinitionKey();
            if ("FormTask_15".equals(defKey)) {
                action = "FCR_DECISION";
                actor = "branch-staff";
            } else if ("FormTask_43".equals(defKey)) {
                action = "CMD_CLASSIFICATION";
                actor = "cmd";
            } else if ("FormTask_48".equals(defKey)) {
                action = "INVESTIGATION_COMPLETED";
                actor = "audit-team";
            } else if ("FormTask_57".equals(defKey)) {
                action = "RESOLUTION_COMPLETED";
                actor = "work-unit";
            } else if ("FormTask_ChiefCommittee".equals(defKey)) {
                action = "COMMITTEE_DECISION";
                actor = "chief-committee";

                String decision = (String) variables.get("committeeDecision");
                if ("rejected".equalsIgnoreCase(decision)) {
                    String explanation = (String) variables.getOrDefault("committeeExplanation",
                            "No explanation provided.");
                    String preferredLanguage = (String) vars.get("preferredLanguage");
                    if (preferredLanguage == null && customer != null) {
                        preferredLanguage = (String) customer.getOrDefault("preferredLanguage", "english");
                    }
                    String customMsg;
                    if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                        customMsg = String.format(
                                "ውድ %s፣\n\n" +
                                "ቅሬታዎ (የቲኬት ቁጥር: %s) በዋናው ኮሚቴ ውድቅ የተደረገ መሆኑን እናሳውቃለን።\n\n" +
                                "የኮሚቴው ማብራሪያ / የውድቅት ምክንያት:\n" +
                                "%s\n\n" +
                                "በመልካም አክብሮት፣\n" +
                                "ዋና ኮሚቴ\n" +
                                "ዳሽን ባንክ",
                                cName != null ? cName : "ውድ ደንበኛ",
                                ticketId,
                                explanation);
                    } else {
                        customMsg = String.format(
                                "Dear %s,\n\n" +
                                        "We regret to inform you that your complaint (Ticket Number: %s) has been rejected by the Chief Committee.\n\n"
                                        +
                                        "Committee Explanation / Rejection Reason:\n" +
                                        "%s\n\n" +
                                        "Best regards,\n" +
                                        "Chief Committee\n" +
                                        "Complaint Management System",
                                cName != null ? cName : "Valued Customer",
                                ticketId,
                                explanation);
                    }
                    variables.put("customNotificationMessage", customMsg);
                }
            } else if ("ServiceTask_65".equals(defKey) || "ServiceTask_62".equals(defKey)) {
                action = "NOTIFICATION_SENT";
                actor = "sq-cmd";
            }

            try {
                auditService.log(ticketId, task.getProcessInstanceId(), taskId, action, actor, getCurrentUsername(),
                        description, cName, cEmail, cat, desc);
            } catch (Exception e) {
                System.err.println("Audit logging failed (non-fatal): " + e.getMessage());
            }

            // Record task completion in SLA tracking before completing the task
            try {
                slaTrackingService.recordTaskCompletion(taskId, getCurrentUsername());
            } catch (Exception e) {
                System.err.println("SLA task completion tracking failed: " + e.getMessage());
            }

            // Update branch, district, category on SLA metrics if present in variables
            try {
                String procInstId = task.getProcessInstanceId();
                String branchVar = (String) variables.get("branch");
                String districtVar = (String) variables.get("district");
                String categoryVar = (String) variables.get("complaintCategory");
                String departmentVar = (String) variables.get("department");
                String managerVar = (String) variables.get("manager");
                Long assignedUserIdVar = null;

                if (branchVar != null && !branchVar.isBlank() && departmentVar != null && !departmentVar.isBlank()) {
                    String branchPrefix = branchVar.split(" ")[0].toLowerCase();
                    String deptPrefix = departmentVar.split(" ")[0].toLowerCase();
                    String managerUsername = branchPrefix + "_" + deptPrefix;
                    var uOpt = userRepository.findByUsernameIgnoreCase(managerUsername);
                    if (uOpt.isPresent()) {
                        assignedUserIdVar = uOpt.get().getId();
                    }
                }

                slaTrackingService.updateComplaintDetails(procInstId, branchVar, districtVar, categoryVar, departmentVar, managerVar, assignedUserIdVar);
            } catch (Exception e) {
                System.err.println("Failed to update complaint details in SLA metrics: " + e.getMessage());
            }

            // Strip large base64 attachments from variables before storing as process
            // variables
            // to prevent Flowable/H2 storage issues with oversized strings
            Map<String, Object> processVars = new java.util.HashMap<>(variables);
            processVars.entrySet().removeIf(entry -> {
                if (entry.getValue() instanceof String) {
                    String val = (String) entry.getValue();
                    return val.length() > 50000 && val.startsWith("data:");
                }
                return false;
            });

            // Standalone manager review completion synchronization
            if ("Secondary Resolution Review".equals(task.getName()) || "SecondaryResolutionReview".equals(task.getCategory())) {
                try {
                    String pInstId = task.getProcessInstanceId();
                    if (pInstId != null) {
                        List<Task> activeProcessTasks = taskService.createTaskQuery()
                                .processInstanceId(pInstId)
                                .list();
                        for (Task t : activeProcessTasks) {
                            if ("FormTask_57".equals(t.getTaskDefinitionKey()) || "FormTask_24".equals(t.getTaskDefinitionKey())) {
                                Map<String, Object> syncVars = new HashMap<>();
                                String notes = (String) variables.getOrDefault("resolutionDetails", "");
                                if (notes.isEmpty()) {
                                    notes = (String) variables.getOrDefault("fcrComments", "");
                                }
                                syncVars.put("resolutionDetails", notes);
                                syncVars.put("actionTaken", "Manager secondary resolution review");
                                syncVars.put("isSensitive", false);
                                taskService.complete(t.getId(), syncVars);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to auto-complete related resolution tasks: " + e.getMessage());
                }
            }

            taskService.complete(taskId, processVars);

            String processInstanceId = task.getProcessInstanceId();

            // Record start for any new tasks that appeared after this task was completed
            try {
                List<Task> newTasks = taskService.createTaskQuery()
                        .processInstanceId(processInstanceId).list();
                for (Task newTask : newTasks) {
                    slaTrackingService.recordTaskStart(processInstanceId, ticketId,
                            newTask.getId(), newTask.getTaskDefinitionKey(), newTask.getName(), newTask.getAssignee());
                }
            } catch (Exception e) {
                System.err.println("SLA new task tracking failed: " + e.getMessage());
            }

            boolean isEnded = historyService.createHistoricProcessInstanceQuery()
                    .processInstanceId(processInstanceId).finished().count() > 0;

            if (isEnded) {
                try {
                    auditService.log(ticketId, processInstanceId, null, "CASE_CLOSED", "system", "system",
                            "The complaint lifecycle has been fully completed and the case is closed.", cName, cEmail,
                            cat,
                            desc);
                } catch (Exception e) {
                    System.err.println("Case-closed audit logging failed: " + e.getMessage());
                }
                try {
                    slaTrackingService.markResolved(processInstanceId);
                } catch (Exception e) {
                    System.err.println("SLA resolution marking failed: " + e.getMessage());
                }
            }

            return ResponseEntity.ok(Map.of("taskId", taskId, "completed", true));

        } catch (Exception e) {
            e.printStackTrace();
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to complete task: " + errorMsg, "taskId", taskId));
        }
    }

    @DeleteMapping("/process/{instanceId}")
    public ResponseEntity<Void> deleteProcess(@PathVariable String instanceId) {
        runtimeService.deleteProcessInstance(instanceId, "Deleted by user from dashboard");
        return ResponseEntity.ok().build();
    }

    @PostMapping({"/process/clear-all", "/tasks/clear-all"})
    public ResponseEntity<Map<String, Object>> clearAllTasksAndProcesses() {
        try {
            // Delete active process instances
            var activeInstances = runtimeService.createProcessInstanceQuery().list();
            for (var inst : activeInstances) {
                try {
                    runtimeService.deleteProcessInstance(inst.getId(), "Fresh System Reset");
                } catch (Exception ignored) {}
            }

            // Delete historic process instances
            var historicInstances = historyService.createHistoricProcessInstanceQuery().list();
            for (var hist : historicInstances) {
                try {
                    historyService.deleteHistoricProcessInstance(hist.getId());
                } catch (Exception ignored) {}
            }

            // Delete SLA metrics, time tracking, breach records, audit logs
            slaTrackingService.clearAllSlaData();

            return ResponseEntity.ok(Map.of(
                    "message", "All tasks, process instances, and SLA metrics successfully cleared for fresh start.",
                    "cleared", true
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to clear all tasks: " + e.getMessage()));
        }
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

    @GetMapping("/complaints/status/{ticketId}")
    public ResponseEntity<?> getComplaintStatus(@PathVariable String ticketId) {
        if (ticketId == null || ticketId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ticket number is required"));
        }

        List<AuditLog> logs = auditService.getLogs(null, ticketId, null, null, null);
        if (logs == null || logs.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("error", "No complaint found with the provided ticket number."));
        }

        // logs is sorted by createdAt Descending
        AuditLog latestLog = logs.get(0);
        AuditLog oldestLog = logs.get(logs.size() - 1);

        Map<String, Object> result = new HashMap<>();
        result.put("ticketNumber", ticketId);
        result.put("customerName",
                oldestLog.getCustomerName() != null ? oldestLog.getCustomerName() : latestLog.getCustomerName());
        result.put("currentStatus", latestLog.getAction());
        result.put("submissionDate", oldestLog.getCreatedAt().toString());
        result.put("description", oldestLog.getComplaintDescription() != null ? oldestLog.getComplaintDescription()
                : latestLog.getComplaintDescription());
        result.put("category", oldestLog.getComplaintCategory() != null ? oldestLog.getComplaintCategory()
                : latestLog.getComplaintCategory());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/complaints/status/{ticketId}/tasks")
    public ResponseEntity<?> getComplaintTasks(@PathVariable String ticketId) {
        Map<String, Object> debugInfo = new java.util.HashMap<>();

        // 1. Audit Logs
        List<AuditLog> logs = auditService.getLogs(null, "all".equalsIgnoreCase(ticketId) ? null : ticketId, null, null,
                null);
        debugInfo.put("auditLogs", logs);

        // 2. Active Flowable Tasks
        List<Task> activeTasks = taskService.createTaskQuery().list();
        List<Map<String, Object>> activeResult = new java.util.ArrayList<>();
        for (Task t : activeTasks) {
            Map<String, Object> vars = taskService.getVariables(t.getId());
            Map<String, Object> complaint = (Map<String, Object>) vars.get("complaint");
            String cId = complaint != null ? (String) complaint.get("id") : "unknown";
            if (ticketId.equalsIgnoreCase(cId) || "all".equalsIgnoreCase(ticketId)) {
                activeResult.add(Map.of(
                        "id", t.getId(),
                        "name", t.getName(),
                        "assignee", t.getAssignee() != null ? t.getAssignee() : "null",
                        "definitionKey", t.getTaskDefinitionKey(),
                        "processInstanceId", t.getProcessInstanceId(),
                        "vars", vars));
            }
        }
        debugInfo.put("activeTasks", activeResult);

        // 3. Historic Flowable Tasks
        var historicTasks = historyService.createHistoricTaskInstanceQuery().list();
        List<Map<String, Object>> historicResult = new java.util.ArrayList<>();
        for (var ht : historicTasks) {
            var procVarsResult = historyService.createHistoricProcessInstanceQuery()
                    .processInstanceId(ht.getProcessInstanceId()).includeProcessVariables().singleResult();
            Map<String, Object> vars = procVarsResult != null ? procVarsResult.getProcessVariables() : Map.of();
            Map<String, Object> complaint = (Map<String, Object>) vars.get("complaint");
            String cId = complaint != null ? (String) complaint.get("id") : "unknown";
            if (ticketId.equalsIgnoreCase(cId) || "all".equalsIgnoreCase(ticketId)) {
                historicResult.add(Map.of(
                        "id", ht.getId(),
                        "name", ht.getName() != null ? ht.getName() : "null",
                        "assignee", ht.getAssignee() != null ? ht.getAssignee() : "null",
                        "definitionKey", ht.getTaskDefinitionKey() != null ? ht.getTaskDefinitionKey() : "null",
                        "processInstanceId", ht.getProcessInstanceId(),
                        "deleteReason", ht.getDeleteReason() != null ? ht.getDeleteReason() : "null"));
            }
        }
        debugInfo.put("historicTasks", historicResult);

        return ResponseEntity.ok(debugInfo);
    }

    @PostMapping("/complaints/upload-audio")
    public ResponseEntity<Map<String, Object>> uploadAudio(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
            }

            File uploadsDir = new File("uploads");
            if (!uploadsDir.exists()) {
                uploadsDir.mkdirs();
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + extension;

            Path targetPath = Paths.get("uploads").resolve(fileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8080/api/complaints/attachments/" + fileName;
            return ResponseEntity.ok(Map.of("url", fileUrl, "fileName", originalFilename));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload audio: " + e.getMessage()));
        }
    }

    @GetMapping("/complaints/attachments/{fileName:.+}")
    public ResponseEntity<Resource> getAttachment(@PathVariable String fileName) {
        try {
            Path filePath = Paths.get("uploads").resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                // Fallback to default placeholder files to prevent 404s for legacy or missing attachments
                String lowerName = fileName.toLowerCase();
                Path fallbackPath;
                if (lowerName.endsWith(".mp3") || lowerName.endsWith(".wav") || lowerName.endsWith(".m4a")) {
                    fallbackPath = Paths.get("uploads").resolve("voice.mp3").normalize();
                } else {
                    fallbackPath = Paths.get("uploads").resolve("evidence.pdf").normalize();
                }
                Resource fallbackResource = new UrlResource(fallbackPath.toUri());
                if (fallbackResource.exists()) {
                    String contentType = Files.probeContentType(fallbackPath);
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                            .body(fallbackResource);
                }
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/complaints/upload-evidence")
    public ResponseEntity<Map<String, Object>> uploadEvidence(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
            }

            File uploadsDir = new File("uploads");
            if (!uploadsDir.exists()) {
                uploadsDir.mkdirs();
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + extension;

            Path targetPath = Paths.get("uploads").resolve(fileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "http://localhost:8080/api/complaints/attachments/" + fileName;
            return ResponseEntity.ok(Map.of("url", fileUrl, "fileName", originalFilename));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload evidence: " + e.getMessage()));
        }
    }

    @GetMapping("/complaints/nbe-reports")
    public ResponseEntity<List<Map<String, Object>>> getNbeReports() {
        List<Map<String, Object>> reportList = new java.util.ArrayList<>();
        try {
            var historicInstances = historyService.createHistoricProcessInstanceQuery()
                    .includeProcessVariables()
                    .orderByProcessInstanceStartTime().desc()
                    .list();
                    
            List<ComplaintSlaMetrics> allSla = slaTrackingService.getAllMetrics();
            Map<String, ComplaintSlaMetrics> slaMap = new java.util.HashMap<>();
            if (allSla != null) {
                for (var m : allSla) {
                    if (m.getProcessInstanceId() != null) {
                        slaMap.put(m.getProcessInstanceId(), m);
                    }
                }
            }

            for (var pi : historicInstances) {
                Map<String, Object> vars = pi.getProcessVariables();
                if (vars == null || !vars.containsKey("complaint")) {
                    continue;
                }
                
                Map<String, Object> complaint = (Map<String, Object>) vars.get("complaint");
                Map<String, Object> customer = (Map<String, Object>) vars.get("customer");
                ComplaintSlaMetrics sla = slaMap.get(pi.getId());
                
                Map<String, Object> row = new java.util.HashMap<>();
                row.put("processInstanceId", pi.getId());
                row.put("complaintId", complaint.getOrDefault("id", "N/A"));
                
                String lodgedDate = null;
                if (pi.getStartTime() != null) {
                    lodgedDate = java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(
                        pi.getStartTime().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()
                    );
                }
                row.put("lodgedDate", lodgedDate);
                
                String resolvedDate = null;
                if (pi.getEndTime() != null) {
                    resolvedDate = java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME.format(
                        pi.getEndTime().toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()
                    );
                }
                row.put("resolvedDate", resolvedDate);
                
                row.put("complainantName", customer != null ? customer.getOrDefault("name", "N/A") : "N/A");
                row.put("mobile", customer != null ? customer.getOrDefault("phone", "N/A") : "N/A");
                row.put("email", customer != null ? customer.getOrDefault("email", "N/A") : "N/A");
                String categoryVal = "General";
                if (vars.containsKey("complaintCategory") && vars.get("complaintCategory") != null) {
                    categoryVal = vars.get("complaintCategory").toString();
                } else if (vars.containsKey("category") && vars.get("category") != null) {
                    categoryVal = vars.get("category").toString();
                } else if (complaint != null && complaint.containsKey("category") && complaint.get("category") != null) {
                    categoryVal = complaint.get("category").toString();
                }
                
                if (categoryVal != null && !categoryVal.isEmpty()) {
                    String catLower = categoryVal.toLowerCase().trim();
                    if ("atm".equals(catLower)) categoryVal = "ATM";
                    else if ("card".equals(catLower)) categoryVal = "Card";
                    else if ("mobile".equals(catLower) || "mobile_banking".equals(catLower)) categoryVal = "Mobile Banking";
                    else if ("fraud".equals(catLower)) categoryVal = "Fraud";
                    else if ("account".equals(catLower)) categoryVal = "Account Issue";
                    else if ("loan".equals(catLower)) categoryVal = "Loan / Credit";
                    else if ("transfer".equals(catLower)) categoryVal = "Transfer Issue";
                    else if ("technical".equals(catLower)) categoryVal = "Technical Issue";
                    else if ("employee_behaviour".equals(catLower) || "employee behaviour".equals(catLower)) categoryVal = "Employee Behaviour";
                    else if ("internet_banking".equals(catLower) || "internet banking".equals(catLower)) categoryVal = "Internet Banking";
                    else if ("super_app".equals(catLower) || "super app".equals(catLower)) categoryVal = "Super App";
                    else {
                        if (categoryVal.length() < 30) {
                            categoryVal = categoryVal.substring(0, 1).toUpperCase() + categoryVal.substring(1);
                        } else {
                            categoryVal = "General";
                        }
                    }
                } else {
                    categoryVal = "General";
                }
                row.put("issuesRaised", categoryVal);
                
                long daysOpen = 0;
                if (pi.getStartTime() != null) {
                    java.time.Instant start = pi.getStartTime().toInstant();
                    java.time.Instant end = pi.getEndTime() != null ? pi.getEndTime().toInstant() : java.time.Instant.now();
                    daysOpen = java.time.temporal.ChronoUnit.DAYS.between(
                        start.atZone(java.time.ZoneId.systemDefault()).toLocalDate(), 
                        end.atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                    );
                }
                row.put("daysOpen", daysOpen);
                
                String slaStatus = sla != null ? sla.getSlaStatus() : "ON_TIME";
                row.put("slaStatus", slaStatus);

                boolean referredToNbe = Boolean.TRUE.equals(vars.get("referredToNbe"));
                row.put("referredToNbe", referredToNbe);
                
                String status = "On Track";
                if (referredToNbe) {
                    status = "Referred to NBE";
                } else if (pi.getEndTime() != null) {
                    status = "Resolved";
                } else {
                    boolean requiresInvestigation = Boolean.TRUE.equals(vars.get("requiresInvestigation"));
                    if (requiresInvestigation) {
                        status = "Escalated";
                    }
                }
                row.put("status", status);
                
                // Resolve the handling unit (assigned branch and department)
                String staff = null;
                if (vars.containsKey("branch") && vars.get("branch") != null && !vars.get("branch").toString().isEmpty()) {
                    String b = vars.get("branch").toString();
                    String d = (vars.containsKey("department") && vars.get("department") != null) ? vars.get("department").toString() : "";
                    if (!d.isEmpty()) {
                        staff = b + " / " + d;
                    } else {
                        staff = b;
                    }
                }
                
                // Fallback to customer preferred/lodged branch if not yet routed
                if (staff == null || staff.isEmpty()) {
                    if (complaint != null && complaint.containsKey("branch") && complaint.get("branch") != null) {
                        staff = complaint.get("branch").toString();
                    } else if (customer != null && customer.containsKey("branch") && customer.get("branch") != null) {
                        staff = customer.get("branch").toString();
                    } else {
                        staff = "CMD Screening";
                    }
                }
                row.put("staffHandling", staff);
                
                row.put("reasonForNonResolution", vars.getOrDefault("reasonForNonResolution", ""));
                row.put("additionalComments", vars.getOrDefault("additionalComments", ""));
                
                reportList.add(row);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch NBE report data: " + e.getMessage());
        }
        return ResponseEntity.ok(reportList);
    }

    @PostMapping("/complaints/{instanceId}/nbe-update")
    public ResponseEntity<?> updateNbeVariables(@PathVariable String instanceId, @RequestBody Map<String, Object> payload) {
        try {
            runtimeService.setVariables(instanceId, payload);
            return ResponseEntity.ok(Map.of("message", "NBE variables updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Process instance is no longer active or update failed: " + e.getMessage()));
        }
    }
}
