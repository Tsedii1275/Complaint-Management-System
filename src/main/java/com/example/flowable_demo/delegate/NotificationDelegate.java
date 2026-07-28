package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.AuditService;
import com.example.flowable_demo.service.NotificationService;
import org.flowable.variable.api.delegate.VariableScope;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.flowable.task.service.delegate.DelegateTask;
import org.flowable.task.service.delegate.TaskListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Component("notificationDelegate")
public class NotificationDelegate implements JavaDelegate, TaskListener {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private com.example.flowable_demo.repository.CustomerFeedbackRepository feedbackRepository;

    @Override
    public void notify(DelegateTask delegateTask) {
        executeLogic(delegateTask, (String) delegateTask.getVariable("customNotificationMessage"));
    }

    @Override
    public void execute(DelegateExecution execution) {
        executeLogic(execution, (String) execution.getVariable("customNotificationMessage"));
    }

    private void executeLogic(VariableScope execution, String customMessage) {
        Map<String, Object> complaint = (Map<String, Object>) execution.getVariable("complaint");
        Map<String, Object> customer = (Map<String, Object>) execution.getVariable("customer");

        String ticketId = complaint != null ? (String) complaint.get("id") : "unknown";
        String email = customer != null ? (String) customer.get("email") : null;
        String phone = customer != null ? (String) customer.get("phone") : null;

        String customerName = customer != null ? (String) customer.get("name") : "Valued Customer";
        
        // Get processInstanceId based on type
        String processInstanceId = null;
        if (execution instanceof DelegateExecution) {
            processInstanceId = ((DelegateExecution) execution).getProcessInstanceId();
        } else if (execution instanceof DelegateTask) {
            processInstanceId = ((DelegateTask) execution).getProcessInstanceId();
        }

        String preferredLanguage = (String) execution.getVariable("preferredLanguage");
        if (preferredLanguage == null && customer != null) {
            preferredLanguage = (String) customer.getOrDefault("preferredLanguage", "english");
        }

        String message;
        String subject;
        
        String activityOrTaskKey = null;
        if (execution instanceof DelegateExecution) {
            activityOrTaskKey = ((DelegateExecution) execution).getCurrentActivityId();
        } else if (execution instanceof DelegateTask) {
            activityOrTaskKey = ((DelegateTask) execution).getTaskDefinitionKey();
        }

        if (customMessage != null && !customMessage.trim().isEmpty()) {
            if ("ServiceTask_52".equals(activityOrTaskKey)) {
                // Rejection notification: no feedback link appended
                message = customMessage;
            } else {
                // Resolution notification: append feedback link
                String token = java.util.UUID.randomUUID().toString();
                int currentReopenCount = 0;
                try {
                    var existing = feedbackRepository.findAllByTicketNumber(ticketId);
                    if (existing != null) {
                        currentReopenCount = existing.size();
                    }
                } catch (Exception e) {
                    System.err.println("Failed to read existing feedback records: " + e.getMessage());
                }

                try {
                    com.example.flowable_demo.model.CustomerFeedback fb = com.example.flowable_demo.model.CustomerFeedback.builder()
                            .ticketNumber(ticketId)
                            .complaintId(processInstanceId)
                            .secureToken(token)
                            .tokenExpired(false)
                            .feedbackRequestSentAt(LocalDateTime.now())
                            .reopenCount(currentReopenCount)
                            .reopenedCase(false)
                            .preferredLanguage(preferredLanguage)
                            .build();
                    feedbackRepository.save(fb);
                } catch (Exception e) {
                    System.err.println("Failed to pre-create CustomerFeedback entry: " + e.getMessage());
                }

                String feedbackLink = "http://localhost:3000/customer-feedback?token=" + token;
                if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                    message = customMessage + "\n\nየእርስዎን እርካታ ለማወቅ እንፈልጋለን። እባክዎ ከታች ያለውን ሊንክ በመጎብኘት የረኩ መሆንዎን ያረጋግጡ:\n\n" + feedbackLink;
                } else {
                    message = customMessage + "\n\nWe value your feedback. Please confirm whether you are satisfied with the resolution by visiting the link below:\n\n" + feedbackLink;
                }
            }

            if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                subject = "የቅሬታ ምላሽ - የቲኬት ቁጥር #" + ticketId;
            } else {
                subject = "Complaint Resolved - Ticket #" + ticketId;
            }
        } else {
            // Generate a secure token and pre-save it to DB for customer feedback validation
            String token = java.util.UUID.randomUUID().toString();
            int currentReopenCount = 0;
            try {
                var existing = feedbackRepository.findAllByTicketNumber(ticketId);
                if (existing != null) {
                    currentReopenCount = existing.size();
                }
            } catch (Exception e) {
                System.err.println("Failed to read existing feedback records: " + e.getMessage());
            }

            try {
                com.example.flowable_demo.model.CustomerFeedback fb = com.example.flowable_demo.model.CustomerFeedback.builder()
                        .ticketNumber(ticketId)
                        .complaintId(processInstanceId)
                        .secureToken(token)
                        .tokenExpired(false)
                        .feedbackRequestSentAt(LocalDateTime.now())
                        .reopenCount(currentReopenCount)
                        .reopenedCase(false)
                        .preferredLanguage(preferredLanguage)
                        .build();
                feedbackRepository.save(fb);
            } catch (Exception e) {
                System.err.println("Failed to pre-create CustomerFeedback entry: " + e.getMessage());
            }

            // Generate the customer feedback link
            String feedbackLink = "http://localhost:3000/customer-feedback?token=" + token;

            if ("amharic".equalsIgnoreCase(preferredLanguage)) {
                subject = "ቅሬታዎ ተፈትቷል - የቲኬት ቁጥር #" + ticketId;
                message = String.format(
                    "ውድ %s፣\n\n" +
                    "መልካም ዜና! ቅሬታዎ %s ተገምግሞ መፍትሄ ተሰጥቶታል።\n\n" +
                    "የመፍትሄ ዝርዝሮች:\n" +
                    "- የቅሬታ ቁጥር: %s\n" +
                    "- የተፈታበት ቀን: %s\n\n" +
                    "የእርስዎን እርካታ ለማወቅ እንፈልጋለን። እባክዎ ከታች ያለውን ሊንክ በመጎብኘት የረኩ መሆንዎን ያረጋግጡ:\n\n" +
                    "%s\n\n" +
                    "በመፍትሄው ከረኩ ቅሬታው ይዘጋል። ካልረኩ ቅሬታው ለተጨማሪ እይታ ይመለሳል።\n\n" +
                    "ስለ ትዕግስትዎ እያመሰገንን ማገልገል በመቻላችን ደስተኛ ነን።\n\n" +
                    "በመልካም አክብሮት፣\n" +
                    "የደንበኞች አገልግሎት ክፍል\n" +
                    "ዳሽን ባንክ",
                    customerName,
                    ticketId,
                    ticketId,
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                    feedbackLink
                );
            } else {
                subject = "Complaint Resolved - Ticket #" + ticketId;
                message = String.format(
                    "Dear %s,\n\n" +
                    "Good news! Your complaint %s has been reviewed and a resolution has been provided.\n\n" +
                    "Resolution Details:\n" +
                    "- Ticket Number: %s\n" +
                    "- Resolution Date: %s\n\n" +
                    "We value your feedback. Please confirm whether you are satisfied with the resolution by visiting the link below:\n\n" +
                    "%s\n\n" +
                    "If you are satisfied, the case will be closed. If not, your complaint will be returned to our team for further review.\n\n" +
                    "Thank you for your patience and for giving us the opportunity to address your concerns.\n\n" +
                    "Best regards,\n" +
                    "Customer Service Team\n" +
                    "Complaint Management System",
                    customerName,
                    ticketId,
                    ticketId,
                    LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy")),
                    feedbackLink
                );
            }
        }

        if (email != null) {
            notificationService.sendEmail(email, subject, message);
            execution.setVariable("notification.emailSent", true);
        }
        if (phone != null) {
            notificationService.sendSms(phone, message);
            execution.setVariable("notification.smsSent", true);
        }
        execution.setVariable("notification.sentAt", LocalDateTime.now().toString());

        appendHistory(execution, "Notification sent for ticket=" + ticketId + " email=" + email + " phone=" + phone);

        auditService.log(ticketId, processInstanceId, null, "NOTIFICATION_SENT", "system", "system", "Resolution notification sent to customer.");
    }

    private void appendHistory(VariableScope execution, String event) {
        Object historyVar = execution.getVariable("caseHistory");
        if (historyVar == null) {
            execution.setVariable("caseHistory", event);
        } else {
            execution.setVariable("caseHistory", historyVar.toString() + "\n" + event);
        }
    }
}
