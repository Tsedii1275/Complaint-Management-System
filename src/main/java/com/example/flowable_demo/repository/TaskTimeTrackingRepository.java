package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.TaskTimeTracking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskTimeTrackingRepository extends JpaRepository<TaskTimeTracking, Long> {
    Optional<TaskTimeTracking> findByTaskId(String taskId);
    List<TaskTimeTracking> findByProcessInstanceId(String processInstanceId);
    List<TaskTimeTracking> findByComplaintId(String complaintId);
}
