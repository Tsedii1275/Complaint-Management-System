package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.NotificationService;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component("sendAcknowledgmentDelegate")
public class SendAcknowledgmentDelegate implements JavaDelegate {

    @Autowired
    private NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        Map<String, Object> complaint = (Map<String, Object>) execution.getVariable("complaint");
        Map<String, Object> customer = (Map<String, Object>) execution.getVariable("customer");

        String ticketId = complaint != null ? (String) complaint.get("id") : "unknown";
        String email = customer != null ? (String) customer.get("email") : null;
        String phone = customer != null ? (String) customer.get("phone") : null;

        String message = "Your complaint " + ticketId + " is being processed. Thank you for your patience.";
        String subject = "Complaint Acknowledgment: " + ticketId;

        if (email != null) {
            notificationService.sendEmail(email, subject, message);
            execution.setVariable("ack.emailSent", true);
        }
        if (phone != null) {
            notificationService.sendSms(phone, message);
            execution.setVariable("ack.smsSent", true);
        }

        execution.setVariable("ack.sent", true);
        execution.setVariable("ack.sentAt", LocalDateTime.now().toString());

        appendHistory(execution, "Acknowledgment sent for " + ticketId);
    }

    private void appendHistory(DelegateExecution execution, String event) {
        Object historyVar = execution.getVariable("caseHistory");
        if (historyVar == null) {
            execution.setVariable("caseHistory", event);
        } else {
            execution.setVariable("caseHistory", historyVar.toString() + "\n" + event);
        }
    }
}
