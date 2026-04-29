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
        
        // Map meaningful categories to departments
        if (category != null) {
            switch (category.toLowerCase()) {
                case "financial":
                case "atm":
                case "fraud":
                case "loan":
                    assigned = "audit-team";
                    break;
                case "technical":
                case "account":
                case "mobile":
                case "branch":
                    assigned = "work-unit";
                    break;
                case "general":
                    assigned = "service-quality";
                    break;
                // Legacy support for old codes
                case "hs":
                    assigned = "service-quality";
                    break;
                case "s":
                    assigned = "audit-team";
                    break;
                case "g":
                    assigned = "work-unit";
                    break;
                default:
                    assigned = "work-unit";
                    break;
            }
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
