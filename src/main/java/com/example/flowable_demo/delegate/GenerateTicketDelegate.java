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
        String email = customer != null ? (String) customer.get("email") : null;
        String phone = customer != null ? (String) customer.get("phone") : null;
        String message = "Your complaint has been registered with ticket " + ticket;
        String subject = "Complaint Registered: " + ticket;

        if (email != null) {
            notificationService.sendEmail(email, subject, message);
            execution.setVariable("notification.ticketEmailSent", true);
        }
        if (phone != null) {
            notificationService.sendSms(phone, message);
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
