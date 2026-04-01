package com.example.flowable_demo.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component("assignDepartmentDelegate")
public class AssignDepartmentDelegate implements JavaDelegate {

    @Override
    public void execute(DelegateExecution execution) {
        Map<String, Object> complaint = (Map<String, Object>) execution.getVariable("complaint");
        String category = complaint != null ? (String) complaint.get("category") : null;

        String assigned = "work-unit";
        if ("HS".equalsIgnoreCase(category)) {
            assigned = "service-quality";
        } else if ("S".equalsIgnoreCase(category)) {
            assigned = "audit-team";
        }

        execution.setVariable("assignedDepartment", assigned);
        execution.setVariable("caseOwner", assigned + "-user");

        Object history = execution.getVariable("caseHistory");
        String event = "Assigned department: " + assigned;
        if (history == null) {
            execution.setVariable("caseHistory", event);
        } else {
            execution.setVariable("caseHistory", history.toString() + "\n" + event);
        }
    }
}
