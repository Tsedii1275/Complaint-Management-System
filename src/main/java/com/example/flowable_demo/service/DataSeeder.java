package com.example.flowable_demo.service;

import com.example.flowable_demo.model.*;
import com.example.flowable_demo.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private final DistrictRepository districtRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final ComplaintSlaMetricsRepository slaMetricsRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(DistrictRepository districtRepository,
                      BranchRepository branchRepository,
                      DepartmentRepository departmentRepository,
                      UserRepository userRepository,
                      ComplaintSlaMetricsRepository slaMetricsRepository,
                      PasswordEncoder passwordEncoder) {
        this.districtRepository = districtRepository;
        this.branchRepository = branchRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.slaMetricsRepository = slaMetricsRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        boolean needsReseed = false;
        if (districtRepository.count() > 0) {
            needsReseed = departmentRepository.findAll().stream()
                    .anyMatch(d -> "Service Quality Department".equals(d.getName()));
            if (needsReseed) {
                System.out.println(">>> Old departments detected. Wiping and reseeding organizational hierarchy...");
                departmentRepository.deleteAll();
                branchRepository.deleteAll();
                districtRepository.deleteAll();
            }
        }

        if (districtRepository.count() == 0) {
            seedHierarchy();
        } else {
            seedManagerUsers();
        }

        // Do not auto-seed mock SLA metrics so cleared task state remains completely fresh
        // if (slaMetricsRepository.count() == 0) { seedSampleSlaMetrics(); }
    }

    @SuppressWarnings("null")
    private void seedHierarchy() {
        Map<String, List<BranchSeed>> hierarchy = Map.of(
            "Central District", List.of(
                new BranchSeed("Bole Branch", "BOLE001", "Abebe Kebede (Branch Manager)"),
                new BranchSeed("Main Branch", "MAIN001", "Chala Gobena (Branch Manager)"),
                new BranchSeed("Yeka Branch", "YEKA001", "Kifle Yohannes (Branch Manager)")
            ),
            "Eastern District", List.of(
                new BranchSeed("Adama Branch", "ADAM001", "Aster Asefa (Branch Manager)"),
                new BranchSeed("Jimma Branch", "JIMM001", "Mohammed Amin (Branch Manager)")
            ),
            "Northern District", List.of(
                new BranchSeed("Mekelle Branch", "MEKE001", "Gebre Wahid (Branch Manager)"),
                new BranchSeed("Gondar Branch", "GOND001", "Yohannes Tekle (Branch Manager)")
            ),
            "Southern District", List.of(
                new BranchSeed("Hawassa Branch", "HAWA001", "Zenebech Demisse (Branch Manager)"),
                new BranchSeed("Dilla Branch", "DILL001", "Solomon Teka (Branch Manager)")
            )
        );

        List<DeptSeed> departments = List.of(
            new DeptSeed("ATM Operations", "Tadesse Alamu"),
            new DeptSeed("Digital Banking", "Almaz Gebru"),
            new DeptSeed("Card Operations", "Helen Tesfaye"),
            new DeptSeed("Credit Department", "Fatuma Ahmed"),
            new DeptSeed("Operations Department", "Daniel Assefa"),
            new DeptSeed("Customer Experience", "Lidya Yohannes"),
            new DeptSeed("Fraud Investigation", "Kassahun Solomon")
        );

        for (Map.Entry<String, List<BranchSeed>> entry : hierarchy.entrySet()) {
            District district = districtRepository.save(District.builder().name(entry.getKey()).build());

            for (BranchSeed bs : entry.getValue()) {
                Branch branch = branchRepository.save(Branch.builder()
                        .name(bs.name)
                        .code(bs.code)
                        .managerName(bs.managerName)
                        .district(district)
                        .build());

                List<Department> branchDepts = new ArrayList<>();
                for (DeptSeed ds : departments) {
                    Department dept = Department.builder()
                            .name(ds.name)
                            .managerName(ds.managerName)
                            .branch(branch)
                            .build();
                    branchDepts.add(dept);
                }
                departmentRepository.saveAll(branchDepts);
            }
        }
        System.out.println(">>> Database seeded successfully with Districts, Branches, and Departments.");
        seedManagerUsers();
    }

    private void seedManagerUsers() {
        System.out.println(">>> Checking and seeding manager user accounts...");
        List<Branch> branches = branchRepository.findAll();
        for (Branch branch : branches) {
            String distName = branch.getDistrict().getName();
            String branchName = branch.getName();
            String branchPrefix = branchName.split(" ")[0].toLowerCase();

            List<Department> depts = departmentRepository.findByBranchId(branch.getId());
            for (Department dept : depts) {
                String deptName = dept.getName();
                String deptPrefix = deptName.split(" ")[0].toLowerCase();

                String username = branchPrefix + "_" + deptPrefix;
                String email = username + "@dashenbank.com";

                if (userRepository.findByUsernameIgnoreCase(username).isEmpty()) {
                    User user = User.builder()
                            .username(username)
                            .email(email)
                            .password(passwordEncoder.encode("password123"))
                            .role(Role.ROLE_DEPARTMENT_WORKUNIT)
                            .enabled(true)
                            .district(distName)
                            .branch(branchName)
                            .department(deptName)
                            .fullName(dept.getManagerName())
                            .build();
                    userRepository.save(user);
                }
            }
        }
    }

    private void seedSampleSlaMetrics() {
        System.out.println(">>> Seeding sample Complaint SLA Metrics for Service Quality Governance View...");
        LocalDateTime now = LocalDateTime.now();

        List<ComplaintSlaMetrics> sampleList = List.of(
            ComplaintSlaMetrics.builder()
                .processInstanceId("PROC-1001")
                .complaintId("CM-20260708143325-64724464")
                .complaintCategory("Digital Banking")
                .priority("HIGHLY_SENSITIVE")
                .requiresInvestigation(true)
                .investigationType("DIGITAL_BANKING")
                .branch("Bole Branch")
                .district("Central District")
                .department("Digital Banking")
                .channel("mobile")
                .customerName("Kebede Tadesse")
                .status("IN_PROGRESS")
                .currentStage("SERVICE_QUALITY_REVIEW")
                .currentStageStartedAt(now.minusHours(4))
                .currentStageAllowedMinutes(180)
                .currentStageElapsedMinutes(240)
                .currentStageStatus("BREACHED")
                .overallSlaStartTime(now.minusDays(5))
                .totalAllowedMinutes(13440) // 28 Days
                .totalElapsedMinutes(2400) // 5 Days
                .remainingMinutes(11040)
                .slaStatus("BREACHED")
                .breached(true)
                .escalationLevel(1)
                .createdAt(now.minusDays(5))
                .build(),

            ComplaintSlaMetrics.builder()
                .processInstanceId("PROC-1002")
                .complaintId("CM-20260712091512-10482051")
                .complaintCategory("ATM Dispute")
                .priority("SENSITIVE")
                .requiresInvestigation(true)
                .investigationType("CUSTOMER_ACCOUNT")
                .branch("Bole Branch")
                .district("Central District")
                .department("ATM Operations")
                .channel("atm")
                .customerName("Amina Mohammed")
                .status("IN_PROGRESS")
                .currentStage("AUDIT_INVESTIGATION")
                .currentStageStartedAt(now.minusDays(8))
                .currentStageAllowedMinutes(5280) // 11 Days
                .currentStageElapsedMinutes(3840) // 8 Days
                .currentStageStatus("APPROACHING")
                .overallSlaStartTime(now.minusDays(8))
                .totalAllowedMinutes(13440)
                .totalElapsedMinutes(3840)
                .remainingMinutes(9600)
                .slaStatus("APPROACHING")
                .breached(false)
                .escalationLevel(0)
                .createdAt(now.minusDays(8))
                .build(),

            ComplaintSlaMetrics.builder()
                .processInstanceId("PROC-1003")
                .complaintId("CM-20260715110423-99381204")
                .complaintCategory("Loan Application Delay")
                .priority("GENERAL")
                .requiresInvestigation(false)
                .branch("Main Branch")
                .district("Central District")
                .department("Credit Department")
                .channel("branch")
                .customerName("Solomon Tekle")
                .status("IN_PROGRESS")
                .currentStage("RESOLUTION")
                .currentStageStartedAt(now.minusDays(1))
                .currentStageAllowedMinutes(2880) // 6 Days
                .currentStageElapsedMinutes(480) // 1 Day
                .currentStageStatus("ON_TRACK")
                .overallSlaStartTime(now.minusDays(2))
                .totalAllowedMinutes(4800) // 10 Days
                .totalElapsedMinutes(960) // 2 Days
                .remainingMinutes(3840)
                .slaStatus("ON_TRACK")
                .breached(false)
                .escalationLevel(0)
                .createdAt(now.minusDays(2))
                .build(),

            ComplaintSlaMetrics.builder()
                .processInstanceId("PROC-1004")
                .complaintId("CM-20260718164001-33418290")
                .complaintCategory("Card Transaction Failure")
                .priority("SENSITIVE")
                .requiresInvestigation(true)
                .investigationType("GENERAL")
                .branch("Adama Branch")
                .district("Eastern District")
                .department("Card Operations")
                .channel("pos")
                .customerName("Bethlehem Alemu")
                .status("IN_PROGRESS")
                .currentStage("COMMITTEE_REVIEW")
                .currentStageStartedAt(now.minusDays(4))
                .currentStageAllowedMinutes(1440) // 3 Days
                .currentStageElapsedMinutes(1920) // 4 Days
                .currentStageStatus("BREACHED")
                .overallSlaStartTime(now.minusDays(12))
                .totalAllowedMinutes(13440)
                .totalElapsedMinutes(5760)
                .remainingMinutes(7680)
                .slaStatus("ESCALATED")
                .breached(true)
                .escalationLevel(2)
                .createdAt(now.minusDays(12))
                .build(),

            ComplaintSlaMetrics.builder()
                .processInstanceId("PROC-1005")
                .complaintId("CM-20260719082210-55102948")
                .complaintCategory("Account Balance Discrepancy")
                .priority("GENERAL")
                .requiresInvestigation(false)
                .branch("Hawassa Branch")
                .district("Southern District")
                .department("Customer Experience")
                .channel("web")
                .customerName("Tigist Haile")
                .status("CLOSED")
                .currentStage("COMPLETED")
                .currentStageStatus("ON_TRACK")
                .overallSlaStartTime(now.minusDays(4))
                .totalAllowedMinutes(4800)
                .totalElapsedMinutes(1440) // 3 Days
                .remainingMinutes(3360)
                .slaStatus("RESOLVED_WITHIN_SLA")
                .breached(false)
                .escalationLevel(0)
                .createdAt(now.minusDays(4))
                .resolvedAt(now.minusDays(1))
                .build()
        );

        slaMetricsRepository.saveAll(sampleList);
        System.out.println(">>> Sample Complaint SLA Metrics successfully seeded.");
    }

    private static class BranchSeed {
        String name;
        String code;
        String managerName;

        BranchSeed(String name, String code, String managerName) {
            this.name = name;
            this.code = code;
            this.managerName = managerName;
        }
    }

    private static class DeptSeed {
        String name;
        String managerName;

        DeptSeed(String name, String managerName) {
            this.name = name;
            this.managerName = managerName;
        }
    }
}
