package com.example.flowable_demo.service;

import com.example.flowable_demo.model.HolidayCalendar;
import com.example.flowable_demo.model.SlaConfig;
import com.example.flowable_demo.repository.HolidayCalendarRepository;
import com.example.flowable_demo.repository.SlaConfigRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class SlaConfigService {

    @Autowired
    private SlaConfigRepository slaConfigRepository;

    @Autowired
    private HolidayCalendarRepository holidayCalendarRepository;

    @PostConstruct
    @Transactional
    public void initDefaultSlaConfigsAndHolidays() {
        if (slaConfigRepository.count() == 0) {
            seedDefaultSlaConfigs();
        }
        if (holidayCalendarRepository.count() == 0) {
            seedDefaultHolidays();
        }
    }

    private void seedDefaultSlaConfigs() {
        List<SlaConfig> defaults = List.of(
            // 1. Complaint Intake & Triage SLAs
            SlaConfig.builder().configKey("BRANCH_COMPLAINT_INTAKE").configGroup("INTAKE_SLA").displayName("Branch Office Intake & Registration").allowedMinutes(30).priority("ALL").description("Timeframe allocated for Branch Manager / CSM complaint intake and initial system logging").build(),
            SlaConfig.builder().configKey("HO_CM_INTAKE").configGroup("INTAKE_SLA").displayName("Head Office Customer Management Triage").allowedMinutes(30).priority("ALL").description("Maximum duration allowed for Head Office CM Division triage and case classification").build(),
            SlaConfig.builder().configKey("CONTACT_CENTER_INTAKE").configGroup("INTAKE_SLA").displayName("Omnichannel Contact Center Intake").allowedMinutes(5).priority("ALL").description("Rapid intake timeframe for Contact Center agents registering live customer inquiries").build(),
            SlaConfig.builder().configKey("SUGGESTION_BOX_INTAKE").configGroup("INTAKE_SLA").displayName("Physical Suggestion Box Collection").allowedMinutes(240).priority("ALL").description("Timeframe allowed for clearing physical branch suggestion boxes and registering entries").build(),

            // 2. Stage-Level Workflow SLAs
            SlaConfig.builder().configKey("CMD_SCREENING").configGroup("STAGE_SLA").displayName("CMD Initial Screening & Acknowledgment").allowedMinutes(240).priority("ALL").description("Initial screening, case verification, and customer acknowledgment notification").build(),
            SlaConfig.builder().configKey("CMD_FORWARDING").configGroup("STAGE_SLA").displayName("Work Unit Assignment & Forwarding").allowedMinutes(240).priority("ALL").description("Timeframe permitted for transferring classified complaints to target resolution units").build(),
            SlaConfig.builder().configKey("SERVICE_QUALITY_REVIEW").configGroup("STAGE_SLA").displayName("Service Quality Governance Audit").allowedMinutes(180).priority("ALL").description("Governance review by Service Quality officers for sensitive case resolutions").build(),
            SlaConfig.builder().configKey("CXO_REVIEW").configGroup("STAGE_SLA").displayName("Chief Executive Officer Review").allowedMinutes(180).priority("ALL").description("Executive review window for high-value or systemic complaint directions").build(),
            SlaConfig.builder().configKey("CEO_DIRECTION").configGroup("STAGE_SLA").displayName("Executive Leadership Directive").allowedMinutes(1440).priority("ALL").description("Strategic directive timeframe for executive-level case resolutions").build(),

            // 3. Work Unit Direct Resolution SLAs
            SlaConfig.builder().configKey("WORKUNIT_RESOLUTION_HS").configGroup("WORKUNIT_RESOLUTION").displayName("Direct Resolution: Highly Sensitive").allowedMinutes(1920).priority("HIGHLY_SENSITIVE").description("Resolution timeframe for high-impact complaints handled directly by work units without investigation").build(),
            SlaConfig.builder().configKey("WORKUNIT_RESOLUTION_SENSITIVE").configGroup("WORKUNIT_RESOLUTION").displayName("Direct Resolution: Sensitive").allowedMinutes(1920).priority("SENSITIVE").description("Resolution SLA for sensitive category complaints handled directly by assigned work units").build(),
            SlaConfig.builder().configKey("WORKUNIT_RESOLUTION_GENERAL").configGroup("WORKUNIT_RESOLUTION").displayName("Direct Resolution: General Category").allowedMinutes(2880).priority("GENERAL").description("Standard resolution SLA for general banking inquiries handled directly by work units").build(),

            // 4. Department Investigation Stage SLAs
            SlaConfig.builder().configKey("INVESTIGATION_CUSTOMER_ACCOUNT").configGroup("STAGE_SLA").displayName("Investigation: Customer Accounts & Ledger").allowedMinutes(5280).priority("ALL").description("Formal investigation period for account reconciliation, ledger, and transaction disputes").build(),
            SlaConfig.builder().configKey("INVESTIGATION_LOAN").configGroup("STAGE_SLA").displayName("Investigation: Credit & Facilities").allowedMinutes(7680).priority("ALL").description("Detailed audit window for loan processing, collateral, and credit facility disputes").build(),
            SlaConfig.builder().configKey("INVESTIGATION_IBD").configGroup("STAGE_SLA").displayName("Investigation: International Banking Division").allowedMinutes(7680).priority("ALL").description("Audit window for foreign trade, remittance, and swift payment investigations").build(),
            SlaConfig.builder().configKey("INVESTIGATION_DIGITAL_BANKING").configGroup("STAGE_SLA").displayName("Investigation: Digital Channels & Payment Systems").allowedMinutes(7680).priority("ALL").description("Technical investigation period for mobile banking, ATM, POS, and electronic payment issues").build(),

            // 5. Standing Committee Review SLAs
            SlaConfig.builder().configKey("COMMITTEE_REVIEW_HS_S").configGroup("STAGE_SLA").displayName("Standing Committee Review (Sensitive / HS)").allowedMinutes(1440).priority("HIGHLY_SENSITIVE").description("Standing Complaint Committee review window for sensitive and high-risk cases").build(),
            SlaConfig.builder().configKey("COMMITTEE_REVIEW_GENERAL").configGroup("STAGE_SLA").displayName("Standing Committee Review (General Category)").allowedMinutes(2400).priority("GENERAL").description("Standing Complaint Committee review window for general category appeals").build(),

            // 6. Customer Communication & Final Notification SLA
            SlaConfig.builder().configKey("CUSTOMER_NOTIFICATION").configGroup("CUSTOMER_NOTIFICATION").displayName("Customer Final Resolution Dispatch").allowedMinutes(240).priority("ALL").description("Timeframe allowed for dispatching final written resolution notice to customer via SMS & Email").build(),

            // 7. Total Complaint Lifecycle SLAs (End-to-End)
            SlaConfig.builder().configKey("OVERALL_HS_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: Highly Sensitive (With Inv)").allowedMinutes(13440).priority("HIGHLY_SENSITIVE").description("Maximum end-to-end complaint lifecycle from intake to closure including formal investigation").build(),
            SlaConfig.builder().configKey("OVERALL_SENSITIVE_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: Sensitive (With Inv)").allowedMinutes(13440).priority("SENSITIVE").description("Maximum end-to-end complaint lifecycle for sensitive category cases requiring investigation").build(),
            SlaConfig.builder().configKey("OVERALL_GENERAL_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: General (With Inv)").allowedMinutes(14400).priority("GENERAL").description("Maximum total complaint lifecycle for general category cases requiring formal investigation").build(),
            SlaConfig.builder().configKey("OVERALL_HS_NO_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: Highly Sensitive (No Inv)").allowedMinutes(3840).priority("HIGHLY_SENSITIVE").description("Total allowable lifecycle for highly sensitive complaints resolved without formal investigation").build(),
            SlaConfig.builder().configKey("OVERALL_SENSITIVE_NO_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: Sensitive (No Inv)").allowedMinutes(3840).priority("SENSITIVE").description("Total allowable lifecycle for sensitive complaints resolved directly without formal investigation").build(),
            SlaConfig.builder().configKey("OVERALL_GENERAL_NO_INVESTIGATION").configGroup("OVERALL_CASE_SLA").displayName("Total Lifecycle: General (No Inv)").allowedMinutes(4800).priority("GENERAL").description("Total allowable lifecycle for general category complaints resolved directly without investigation").build(),

            // 8. Leadership Escalation Intervention SLAs
            SlaConfig.builder().configKey("ESCALATION_CM_MANAGER").configGroup("ESCALATION_SLA").displayName("Management Escalation: CM Division Head").allowedMinutes(720).priority("ALL").description("Allocated timeframe for CM Division Manager oversight intervention following an SLA breach").build(),
            SlaConfig.builder().configKey("ESCALATION_DEPARTMENT_DIRECTOR").configGroup("ESCALATION_SLA").displayName("Executive Escalation: Department Director").allowedMinutes(960).priority("ALL").description("Timeframe permitted for Department Director / Regional Director intervention upon tier-2 escalation").build()
        );
        slaConfigRepository.saveAll(defaults);
    }

    private void seedDefaultHolidays() {
        int year = LocalDate.now().getYear();
        List<HolidayCalendar> defaultHolidays = List.of(
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 1, 7)).holidayName("Ethiopian Genna / Christmas").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 1, 19)).holidayName("Ethiopian Epiphany / Timket").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 3, 2)).holidayName("Victory of Adwa").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 5, 1)).holidayName("International Labour Day").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 5, 5)).holidayName("Patriots Victory Day").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 9, 11)).holidayName("Ethiopian New Year (Enkutatash)").holidayType("PUBLIC_HOLIDAY").build(),
            HolidayCalendar.builder().holidayDate(LocalDate.of(year, 9, 27)).holidayName("Finding of True Cross (Meskel)").holidayType("PUBLIC_HOLIDAY").build()
        );
        holidayCalendarRepository.saveAll(defaultHolidays);
    }

    public List<SlaConfig> getAllConfigs() {
        return slaConfigRepository.findAll();
    }

    @Transactional
    public void resetSlaConfigs() {
        slaConfigRepository.deleteAll();
        seedDefaultSlaConfigs();
    }

    public int getAllowedMinutes(String configKey, int fallbackMinutes) {
        Optional<SlaConfig> configOpt = slaConfigRepository.findByConfigKey(configKey);
        return configOpt.map(SlaConfig::getAllowedMinutes).orElse(fallbackMinutes);
    }

    @Transactional
    public SlaConfig updateConfig(Long id, Integer allowedMinutes, String displayName, String description) {
        SlaConfig config = slaConfigRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SLA Config not found with ID: " + id));
        if (allowedMinutes != null) config.setAllowedMinutes(allowedMinutes);
        if (displayName != null) config.setDisplayName(displayName);
        if (description != null) config.setDescription(description);
        return slaConfigRepository.save(config);
    }

    @Transactional
    public List<HolidayCalendar> getAllHolidays() {
        return holidayCalendarRepository.findAll();
    }

    @Transactional
    public HolidayCalendar addHoliday(LocalDate date, String name, String type) {
        HolidayCalendar h = HolidayCalendar.builder()
                .holidayDate(date)
                .holidayName(name)
                .holidayType(type != null ? type : "PUBLIC_HOLIDAY")
                .build();
        return holidayCalendarRepository.save(h);
    }

    @Autowired(required = false)
    private com.example.flowable_demo.repository.ComplaintSlaMetricsRepository slaMetricsRepository;

    @Autowired(required = false)
    private com.example.flowable_demo.repository.AuditLogRepository auditLogRepository;

    @Transactional
    public void purgeAllSlaData() {
        if (slaMetricsRepository != null) {
            slaMetricsRepository.deleteAll();
        }
        if (auditLogRepository != null) {
            auditLogRepository.deleteAll();
        }
    }

    @Transactional
    public void deleteHoliday(Long id) {
        holidayCalendarRepository.deleteById(id);
    }
}
