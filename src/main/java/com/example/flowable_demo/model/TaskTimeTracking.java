package com.example.flowable_demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_time_tracking")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTimeTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_instance_id", length = 100)
    private String processInstanceId;

    @Column(name = "complaint_id", length = 100)
    private String complaintId;

    @Column(name = "task_id", length = 100)
    private String taskId;

    @Column(name = "task_definition_key", length = 100)
    private String taskDefinitionKey;

    @Column(name = "task_name", length = 255)
    private String taskName;

    @Column(name = "lane_name", length = 50)
    private String laneName;

    @Column(name = "assigned_user", length = 100)
    private String assignedUser;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "duration_minutes")
    private Long durationMinutes;

    @Column(name = "duration_hours")
    private Double durationHours;
}
