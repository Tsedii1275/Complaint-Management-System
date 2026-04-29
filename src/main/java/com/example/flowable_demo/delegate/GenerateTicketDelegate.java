package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.NotificationService;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component("generateTicketDelegate")
public class GenerateTicketDelegate implements JavaDelegate {

    @Autowired
    private NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        Map<String, Object> complaint = (Map<String, Object>) execution.getVariable("complaint");
        if (complaint == null) {
            complaint = new HashMap<>();
        }

        String ticket = "CM-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 8);
        complaint.put("id", ticket);
        execution.setVariable("complaint", complaint);
        execution.setVariable("createdAt", LocalDateTime.now().toString());

        // default SLA deadline (example: 24h from now, can be recalculated in next
        // delegates)
        Map<String, Object> sla = (Map<String, Object>) execution.getVariable("sla");
        if (sla == null) {
            sla = new HashMap<>();
        }
        sla.put("deadline", LocalDateTime.now().plusHours(24).toString());
        sla.put("breached", false);
        sla.put("reminderCount", 0);
        sla.put("escalationLevel", 0);
        execution.setVariable("sla", sla);

        appendHistory(execution, "Ticket generated: " + ticket);

        // Immediate notification to customer after ticket generation (email + SMS)
        Map<String, Object> customer = (Map<String, Object>) execution.getVariable("customer");
        String customerName = customer != null ? (String) customer.get("name") : "Valued Customer";
        String email = customer != null ? (String) customer.get("email") : null;
        String phone = customer != null ? (String) customer.get("phone") : null;
        
        // Professional email message
        String emailMessage = String.format(
            "Dear %s,\n\n" +
            "Thank you for contacting us. Your complaint has been registered successfully.\n\n" +
            "Ticket Number: %s\n" +
            "Registration Date: %s\n\n" +
            "We have received your complaint and our team will review it shortly. You can follow up on your complaint status using the ticket number provided above.\n\n" +
            "For any urgent inquiries, please contact our customer service hotline.\n\n" +
            "Best regards,\n" +
            "Customer Service Team\n" +
            "Complaint Management System",
            customerName,
            ticket,
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a"))
        );
        
        // SMS message (shorter format)
        String smsMessage = String.format(
            "Your complaint has been registered with ticket %s. We will contact you shortly. For inquiries, mention: %s",
            ticket,
            ticket
        );
        
        String subject = "Complaint Registered - Ticket #" + ticket;

        if (email != null) {
            notificationService.sendEmail(email, subject, emailMessage);
            execution.setVariable("notification.ticketEmailSent", true);
        }
        if (phone != null) {
            notificationService.sendSms(phone, smsMessage);
            execution.setVariable("notification.ticketSmsSent", true);
        }

        appendHistory(execution, "Immediate ticket notification sent to customer");
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
