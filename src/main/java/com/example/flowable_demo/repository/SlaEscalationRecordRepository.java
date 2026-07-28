package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.SlaEscalationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlaEscalationRecordRepository extends JpaRepository<SlaEscalationRecord, Long> {
    List<SlaEscalationRecord> findByComplaintId(String complaintId);
    List<SlaEscalationRecord> findByProcessInstanceId(String processInstanceId);
}
