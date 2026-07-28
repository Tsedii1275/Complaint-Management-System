package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.SlaBreachRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SlaBreachRecordRepository extends JpaRepository<SlaBreachRecord, Long> {
    List<SlaBreachRecord> findByComplaintId(String complaintId);
    List<SlaBreachRecord> findByResponsibleWorkUnit(String responsibleWorkUnit);
}
