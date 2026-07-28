package com.example.flowable_demo.service;

import com.example.flowable_demo.model.ComplaintSlaMetrics;
import com.example.flowable_demo.model.SlaBreachRecord;
import com.example.flowable_demo.model.SlaEscalationRecord;
import com.example.flowable_demo.repository.ComplaintSlaMetricsRepository;
import com.example.flowable_demo.repository.SlaBreachRecordRepository;
import com.example.flowable_demo.repository.SlaEscalationRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class SlaAutomationScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaAutomationScheduler.class);

    @Autowired
    private ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired
    private SlaTrackingService slaTrackingService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuditService auditService;

    @Autowired
    private SlaBreachRecordRepository breachRecordRepository;

    @Autowired
    private SlaEscalationRecordRepository escalationRecordRepository;

    /**
     * Periodically checks all active complaints every 60 seconds to evaluate business hours SLAs,
     * issue automated 80% / 100% reminders, record breaches, and execute multi-level escalations.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void runSlaMonitoringAndEscalations() {
        List<ComplaintSlaMetrics> activeCases = slaMetricsRepository.findAll().stream()
                .filter(m -> !"CLOSED".equalsIgnoreCase(m.getStatus()) && !"COMPLETED".equalsIgnoreCase(m.getCurrentStage()))
                .toList();

        if (activeCases.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();

        for (ComplaintSlaMetrics m : activeCases) {
            try {
                slaTrackingService.recalculateSlaStatus(m);
                int allowed = m.getTotalAllowedMinutes() != null ? m.getTotalAllowedMinutes() : 480;
                int elapsed = m.getTotalElapsedMinutes() != null ? m.getTotalElapsedMinutes() : 0;
                double consumptionRatio = (double) elapsed / (double) Math.max(1, allowed);

                String complaintId = m.getComplaintId() != null ? m.getComplaintId() : "CM-" + m.getProcessInstanceId();

                // ─── Reminder Level 1 (80% SLA consumed) ───
                if (consumptionRatio >= 0.80 && consumptionRatio < 1.0 && (m.getReminder1Sent() == null || !m.getReminder1Sent())) {
                    m.setReminder1Sent(true);
                    m.setSlaStatus("APPROACHING");
                    String msg = "Complaint " + complaintId + " is approaching SLA deadline (80% of allowed time consumed).";
                    auditService.log(complaintId, m.getProcessInstanceId(), null, "SLA_REMINDER_SENT", "SYSTEM", "SYSTEM", msg, m.getCustomerName(), null, m.getComplaintCategory(), null);
                    log.info(">>> Triggered SLA Reminder Level 1 for {}", complaintId);
                }

                // ─── Reminder Level 2 (100% SLA reached) ───
                if (consumptionRatio >= 1.0 && (m.getReminder2Sent() == null || !m.getReminder2Sent())) {
                    m.setReminder2Sent(true);
                    m.setBreached(true);
                    m.setBreachedAt(now);
                    m.setSlaStatus("BREACHED");
                    String msg = "SLA deadline has been exceeded for Complaint " + complaintId + ".";
                    auditService.log(complaintId, m.getProcessInstanceId(), null, "SLA_BREACHED", "SYSTEM", "SYSTEM", msg, m.getCustomerName(), null, m.getComplaintCategory(), null);

                    // Create SLA Breach Record
                    SlaBreachRecord breach = SlaBreachRecord.builder()
                            .complaintId(complaintId)
                            .processInstanceId(m.getProcessInstanceId())
                            .stageName(m.getCurrentStage())
                            .breachReason("SLA allowed minutes exceeded (" + elapsed + "/" + allowed + " mins)")
                            .breachDurationMinutes((long) (elapsed - allowed))
                            .responsibleWorkUnit(m.getDepartment() != null ? m.getDepartment() : m.getBranch())
                            .escalationLevel(m.getEscalationLevel() != null ? m.getEscalationLevel() : 0)
                            .escalationActionsTaken("Automated Level 2 Alert sent to Manager & Team Leader")
                            .build();
                    breachRecordRepository.save(breach);
                    log.warn(">>> Recorded SLA Breach for {}", complaintId);
                }

                // ─── Reminder Level 3 & Multi-Level Escalation ───
                if (consumptionRatio >= 1.20 && (m.getReminder3Sent() == null || !m.getReminder3Sent())) {
                    m.setReminder3Sent(true);
                    int prevLevel = m.getEscalationLevel() != null ? m.getEscalationLevel() : 0;
                    int newLevel = Math.min(prevLevel + 1, 4);

                    m.setEscalationLevel(newLevel);
                    m.setEscalatedAt(now);
                    m.setSlaStatus("ESCALATED");

                    String targetRole = switch (newLevel) {
                        case 1 -> "Department Manager / CMD Manager";
                        case 2 -> "Department Director";
                        case 3 -> "Concerned Chief Officer (CxO)";
                        default -> "Executive (CEO / Board Committee)";
                    };

                    String msg = "Complaint " + complaintId + " marked as SLA Escalated to " + targetRole + " due to continued delay.";
                    auditService.log(complaintId, m.getProcessInstanceId(), null, "SLA_ESCALATED", "SYSTEM", "SYSTEM", msg, m.getCustomerName(), null, m.getComplaintCategory(), null);

                    SlaEscalationRecord escRecord = SlaEscalationRecord.builder()
                            .complaintId(complaintId)
                            .processInstanceId(m.getProcessInstanceId())
                            .fromLevel(prevLevel)
                            .toLevel(newLevel)
                            .escalatedFromUnit(m.getDepartment() != null ? m.getDepartment() : m.getBranch())
                            .escalatedToRole(targetRole)
                            .reason("Non-response post-breach. 120%+ SLA time consumed.")
                            .build();
                    escalationRecordRepository.save(escRecord);
                    log.warn(">>> Triggered SLA Escalation Level {} for {}", newLevel, complaintId);
                }

                slaMetricsRepository.save(m);
            } catch (Exception e) {
                log.error("Error processing SLA automation for instance {}", m.getProcessInstanceId(), e);
            }
        }
    }
}
