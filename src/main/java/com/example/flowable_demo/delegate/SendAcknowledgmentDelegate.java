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
        
        // This delegate is only reached when isFCR=false (complaint escalated to CMD).
        // Always send the escalation acknowledgment to inform customer their case is being reviewed.

        String customerName = customer != null ? (String) customer.get("name") : "Valued Customer";
        
        String preferredLanguage = (String) execution.getVariable("preferredLanguage");
        if (preferredLanguage == null && customer != null) {
            preferredLanguage = (String) customer.getOrDefault("preferredLanguage", "english");
        }

        String message;
        String subject;

        if ("amharic".equalsIgnoreCase(preferredLanguage)) {
            subject = "የቅሬታ መቀበያ ማረጋገጫ - የቲኬት ቁጥር #" + ticketId;
            message = String.format(
                "ውድ %s፣\n\n" +
                "ቅሬታዎ %s በተሳካ ሁኔታ መድረሱን ማረጋገጥ እንወዳለን።\n\n" +
                "ጉዳይዎ በአሁኑ ጊዜ በቡድናችን እየታየ ነው። ቅሬታዎን በጥልቀት መርምረን የመፍትሄ ሂደቱን እናሳውቆታለን።\n\n" +
                "ለማንኛውም ክትትል የቅሬታ ቁጥር %s በመጥቀስ መከታተል ይችላሉ።\n\n" +
                "ለትዕግስትዎ እያመሰገንን ጉዳዩን በአፋጣኝ ለመፍታት የምንችለውን ሁሉ እናደርጋለን።\n\n" +
                "በመልካም አክብሮት፣\n" +
                "የደንበኞች አገልግሎት ክፍል\n" +
                "ዳሽን ባንክ",
                customerName,
                ticketId,
                ticketId
            );
        } else {
            subject = "Complaint Acknowledgment - Ticket #" + ticketId;
            message = String.format(
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
        }

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
