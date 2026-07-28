package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.CapaAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CapaActionRepository extends JpaRepository<CapaAction, Long> {
    List<CapaAction> findByRcaCaseId(Long rcaCaseId);
}
