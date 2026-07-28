package com.example.flowable_demo.repository;

import com.example.flowable_demo.model.CustomerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    Optional<CustomerFeedback> findBySecureToken(String secureToken);
    List<CustomerFeedback> findAllByTicketNumber(String ticketNumber);
    Optional<CustomerFeedback> findTopByTicketNumberOrderBySubmittedAtDesc(String ticketNumber);
}
