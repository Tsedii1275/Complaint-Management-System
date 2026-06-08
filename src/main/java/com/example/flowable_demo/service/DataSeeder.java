package com.example.flowable_demo.service;

import com.example.flowable_demo.model.Branch;
import com.example.flowable_demo.model.Department;
import com.example.flowable_demo.model.District;
import com.example.flowable_demo.repository.BranchRepository;
import com.example.flowable_demo.repository.DepartmentRepository;
import com.example.flowable_demo.repository.DistrictRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class DataSeeder implements CommandLineRunner {

    private final DistrictRepository districtRepository;
    private final BranchRepository branchRepository;
    private final DepartmentRepository departmentRepository;

    public DataSeeder(DistrictRepository districtRepository,
                      BranchRepository branchRepository,
                      DepartmentRepository departmentRepository) {
        this.districtRepository = districtRepository;
        this.branchRepository = branchRepository;
        this.departmentRepository = departmentRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (districtRepository.count() == 0) {
            seedHierarchy();
        }
    }

    @SuppressWarnings("null")
    private void seedHierarchy() {
        // Define Districts and Branches
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

        // Standard departments list
        List<DeptSeed> departments = List.of(
            new DeptSeed("Service Quality Department", "Tadesse Alamu"),
            new DeptSeed("ATM & Card Management Department", "Helen Tesfaye"),
            new DeptSeed("Information Technology (IT) Department", "Samuel Bekele"),
            new DeptSeed("Accounts Management Department", "Bekele Zewdu"),
            new DeptSeed("Credit & Loan Services Department", "Fatuma Ahmed"),
            new DeptSeed("Digital Banking Department", "Almaz Gebru"),
            new DeptSeed("Risk & Fraud Management Department", "Kassahun Solomon"),
            new DeptSeed("Human Resources (HR) Department", "Lidya Yohannes"),
            new DeptSeed("Operations & Administration Department", "Daniel Assefa")
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
