package com.example.flowable_demo.delegate;

import com.example.flowable_demo.service.SlaTrackingService;
import org.flowable.task.service.delegate.DelegateTask;
import org.flowable.engine.delegate.TaskListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component("taskTimeTrackingListener")
public class TaskTimeTrackingListener implements TaskListener {

    @Autowired
    private SlaTrackingService slaTrackingService;

    @Override
    public void notify(DelegateTask delegateTask) {
        String eventName = delegateTask.getEventName();
        String taskId = delegateTask.getId();
        String processInstanceId = delegateTask.getProcessInstanceId();
        String taskDefinitionKey = delegateTask.getTaskDefinitionKey();
        String taskName = delegateTask.getName();
        String assignee = delegateTask.getAssignee();

        // Get complaintId from process variables
        Object complaintObj = delegateTask.getVariable("complaint");
        String complaintId = "unknown";
        if (complaintObj instanceof java.util.Map) {
            complaintId = (String) ((java.util.Map<?, ?>) complaintObj).get("id");
        }

        if ("create".equalsIgnoreCase(eventName)) {
            slaTrackingService.recordTaskStart(processInstanceId, complaintId, taskId, taskDefinitionKey, taskName, assignee);
        } else if ("complete".equalsIgnoreCase(eventName)) {
            slaTrackingService.recordTaskCompletion(taskId, assignee);
        }
    }
}
