package com.example.flowable_demo.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component("slaEscalationDelegate")
public class SLAEscalationDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        Map<String, Object> sla = (Map<String, Object>) execution.getVariable("sla");
        if (sla == null) {
            throw new IllegalStateException("SLA object missing");
        }

        Integer reminderCount = sla.getOrDefault("reminderCount", 0) instanceof Integer
                ? (Integer) sla.get("reminderCount")
                : 0;
        Integer level = sla.getOrDefault("escalationLevel", 0) instanceof Integer
                ? (Integer) sla.get("escalationLevel")
                : 0;

        reminderCount++;
        if (reminderCount >= 3) {
            level = 3;
            sla.put("breached", true);
            execution.setVariable("caseOwner", "manager");
            execution.setVariable("assignedDepartment", "management");
        } else if (reminderCount == 2) {
            level = 2;
            execution.setVariable("caseOwner", "team_lead");
        } else {
            level = 1;
        }

        sla.put("reminderCount", reminderCount);
        sla.put("escalationLevel", level);

        execution.setVariable("sla", sla);
        execution.setVariable("sla.escalationTime", LocalDateTime.now().toString());

        appendHistory(execution, "SLA escalation run: reminderCount=" + reminderCount + ", escalationLevel=" + level);
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
