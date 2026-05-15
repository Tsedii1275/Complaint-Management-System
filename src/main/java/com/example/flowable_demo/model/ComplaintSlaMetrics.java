package com.example.flowable_demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_sla_metrics")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintSlaMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "process_instance_id", length = 100, unique = true)
    private String processInstanceId;

    @Column(name = "complaint_id", length = 100)
    private String complaintId;

    @Column(name = "complaint_category", length = 100)
    private String complaintCategory;

    @Column(name = "total_allowed_minutes")
    private Integer totalAllowedMinutes;

    @Column(name = "total_elapsed_minutes")
    private Integer totalElapsedMinutes;

    @Column(name = "remaining_minutes")
    private Integer remainingMinutes;

    @Column(name = "sla_status", length = 30)
    private String slaStatus; // ON_TIME, APPROACHING, OVERDUE, BREACHED

    @Column(name = "breached")
    private Boolean breached;

    @Column(name = "deadline")
    private LocalDateTime deadline;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    // Duration in minutes spent in each lane
    @Column(name = "branch_staff_duration")
    @Builder.Default
    private Integer branchStaffDuration = 0;

    @Column(name = "cmd_duration")
    @Builder.Default
    private Integer cmdDuration = 0;

    @Column(name = "audit_duration")
    @Builder.Default
    private Integer auditDuration = 0;

    @Column(name = "department_duration")
    @Builder.Default
    private Integer departmentDuration = 0;

    @Column(name = "service_quality_duration")
    @Builder.Default
    private Integer serviceQualityDuration = 0;
}
