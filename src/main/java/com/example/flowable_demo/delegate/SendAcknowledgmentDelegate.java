package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.NotificationService;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
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
        
        // Check if immediate notification was already sent by ProcessController
        Boolean ticketEmailSent = (Boolean) execution.getVariable("notification.ticketEmailSent");
        if (ticketEmailSent != null && ticketEmailSent) {
            // Immediate notification was already sent, skip sending acknowledgment
            appendHistory(execution, "Acknowledgment skipped - immediate notification already sent for " + ticketId);
            return;
        }

        String customerName = customer != null ? (String) customer.get("name") : "Valued Customer";
        
        // Professional acknowledgment message
        String message = String.format(
            "Dear %s,\n\n" +
            "We acknowledge receipt of your complaint %s.\n\n" +
            "Your case is now being processed by our team. We will review your complaint thoroughly and provide you with updates on the resolution progress.\n\n" +
            "You can reference your ticket number %s for any follow-up inquiries.\n\n" +
            "We appreciate your patience and will do our best to resolve your matter promptly.\n\n" +
            "Best regards,\n" +
            "Customer Service Team\n" +
            "Complaint Management System",
            customerName,
            ticketId,
            ticketId
        );
        
        String subject = "Complaint Acknowledgment - Ticket #" + ticketId;

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
