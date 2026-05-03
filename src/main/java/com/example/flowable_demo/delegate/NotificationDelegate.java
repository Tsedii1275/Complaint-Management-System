package com.example.flowable_demo.delegate;

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
        
        String message;
        
        if (customMessage != null && !customMessage.trim().isEmpty()) {
            message = customMessage;
        } else {
            // Professional notification message default template
            message = String.format(
                "Dear %s,\n\n" +
                "Good news! Your complaint %s has been processed and resolved.\n\n" +
                "Resolution Details:\n" +
                "- Ticket Number: %s\n" +
                "- Resolution Date: %s\n\n" +
                "We hope the resolution meets your expectations. If you have any questions or need further assistance, please don't hesitate to contact us.\n\n" +
                "Thank you for your patience and for giving us the opportunity to address your concerns.\n\n" +
                "Best regards,\n" +
                "Customer Service Team\n" +
                "Complaint Management System",
                customerName,
                ticketId,
                ticketId,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy"))
            );
        }
        
        String subject = "Complaint Resolved - Ticket #" + ticketId;

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
