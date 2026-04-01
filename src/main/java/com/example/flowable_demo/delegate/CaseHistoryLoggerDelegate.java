package com.example.flowable_demo.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component("caseHistoryLoggerDelegate")
public class CaseHistoryLoggerDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        String event = (String) execution.getVariable("caseHistoryEvent");
        if (event == null) {
            event = "Task " + execution.getCurrentActivityId() + " executed";
        }

        Object history = execution.getVariable("caseHistory");
        String historyData = history != null ? history.toString() : "";
        historyData = historyData + (historyData.isEmpty() ? "" : "\n") + LocalDateTime.now() + " - " + event;

        execution.setVariable("caseHistory", historyData);
        execution.setVariable("caseHistoryEvent", null);

        Map<String, Object> sla = (Map<String, Object>) execution.getVariable("sla");
        if (sla != null) {
            sla.put("updatedAt", LocalDateTime.now().toString());
            execution.setVariable("sla", sla);
        }
    }
}
