package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.ComplaintSlaMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ComplaintSlaMetricsRepository extends JpaRepository<ComplaintSlaMetrics, Long>, JpaSpecificationExecutor<ComplaintSlaMetrics> {
    Optional<ComplaintSlaMetrics> findByProcessInstanceId(String processInstanceId);
    Optional<ComplaintSlaMetrics> findByComplaintId(String complaintId);
}
