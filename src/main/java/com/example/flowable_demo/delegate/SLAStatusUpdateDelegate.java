package com.example.flowable_demo.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component("slaStatusUpdateDelegate")
public class SLAStatusUpdateDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        Map<String, Object> sla = (Map<String, Object>) execution.getVariable("sla");
        if (sla == null) {
            throw new IllegalStateException("SLA object missing");
        }

        sla.put("breached", true);
        sla.put("breachedAt", LocalDateTime.now().toString());

        execution.setVariable("sla", sla);
        appendHistory(execution, "SLA breached, set breached=true");
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
