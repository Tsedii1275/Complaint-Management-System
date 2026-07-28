package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.RcaCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RcaCaseRepository extends JpaRepository<RcaCase, Long> {
    Optional<RcaCase> findByTicketId(String ticketId);
}
