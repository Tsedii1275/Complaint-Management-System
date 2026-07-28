package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.AuditService;
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

    @Autowired
    private AuditService auditService;

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
        
        String preferredLanguage = (String) execution.getVariable("preferredLanguage");
        if (preferredLanguage == null && customer != null) {
            preferredLanguage = (String) customer.getOrDefault("preferredLanguage", "english");
        }

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
                "ቅሬታዎን ደርሶናል፤ ቡድናችን በቅርቡ ይመረምረዋል። በተሰጠው የቅሬታ ቁጥር ቅሬታዎን መከታተል ይችላሉ።\n\n" +
                "ለማንኛውም አስቸኳይ ጥያቄ እባክዎን በደንበኞች አገልግሎት የስልክ መስመራችን ያነጋግሩን።\n\n" +
                "በመልካም አክብሮት፣\n" +
                "የደንበኞች አገልግሎት ክፍል\n" +
                "ዳሽን ባንክ",
                customerName,
                ticket,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
            );
            smsMessage = String.format(
                "ቅሬታዎ በቁጥር %s በተሳካ ሁኔታ ተመዝግቧል። ለማንኛውም ጥያቄ ቁጥሩን ይጠቅሱ።",
                ticket
            );
        } else {
            subject = "Complaint Registered - Ticket #" + ticket;
            emailMessage = String.format(
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
            smsMessage = String.format(
                "Your complaint has been registered with ticket %s. We will contact you shortly. For inquiries, mention: %s",
                ticket,
                ticket
            );
        }

        if (email != null) {
            notificationService.sendEmail(email, subject, emailMessage);
            execution.setVariable("notification.ticketEmailSent", true);
        }
        if (phone != null) {
            notificationService.sendSms(phone, smsMessage);
            execution.setVariable("notification.ticketSmsSent", true);
        }

        appendHistory(execution, "Immediate ticket notification sent to customer");

        auditService.log(ticket, execution.getProcessInstanceId(), null, "TICKET_GENERATED", "system", "system", "Ticket " + ticket + " has been successfully generated.");
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
