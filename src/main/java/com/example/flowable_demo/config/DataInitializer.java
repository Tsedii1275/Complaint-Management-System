package com.example.flowable_demo.config;

import com.example.flowable_demo.model.Role;
import com.example.flowable_demo.model.User;
import com.example.flowable_demo.model.Customer;
import com.example.flowable_demo.repository.UserRepository;
import com.example.flowable_demo.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(100) NOT NULL");
        } catch (Exception e) {
            System.out.println("Role column alter info: " + e.getMessage());
        }

        seedUser("tseday", "tseday@dashenbank.com", "password123", Role.ROLE_BRANCH_STAFF, "Central District", "Bole Branch", null, "Tseday");
        seedUser("eyoda", "eyoda@dashenbank.com", "password123", Role.ROLE_CMD_OFFICER, null, null, null, "Eyoda Ephrem");
        seedUser("haset", "haset@dashenbank.com", "password123", Role.ROLE_CMD_OFFICER, null, null, null, "Haset");
        seedUser("musie", "musie@dashenbank.com", "password123", Role.ROLE_AUDIT_TEAM, null, null, null, "Musie");
        seedUser("selam", "selam@dashenbank.com", "password123", Role.ROLE_DEPARTMENT_WORKUNIT, "Central District", "Bole Branch", "ATM Operations", "Tadesse Alamu");
        seedUser("lidiya", "lidiya@dashenbank.com", "password123", Role.ROLE_SERVICE_QUALITY, null, null, null, "Lidiya");
        seedUser("abel", "abel@dashenbank.com", "password123", Role.ROLE_CHIEF_COMMITTEE, null, null, null, "Abel");
        seedUser("admin", "admin@dashenbank.com", "admin123", Role.ROLE_ADMIN, null, null, null, "Administrator");

        // Management Roles
        seedUser("bmanager", "bmanager@dashenbank.com", "password123", Role.ROLE_BRANCH_MANAGER, "Central District", "Bole Branch", null, "Abebe Branch Manager");
        seedUser("dmanager", "dmanager@dashenbank.com", "password123", Role.ROLE_DEPARTMENT_MANAGER, "Central District", "Bole Branch", "ATM Operations", "Kebede Department Manager");
        seedUser("rdirector", "rdirector@dashenbank.com", "password123", Role.ROLE_REGIONAL_DIRECTOR, "Central District", null, null, "Solomon Regional Director");
        seedUser("ddirector", "ddirector@dashenbank.com", "password123", Role.ROLE_DEPARTMENT_DIRECTOR, null, null, "Digital Banking", "Hiwot Department Director");

        // Executive Roles
        seedUser("cbo", "cbo@dashenbank.com", "password123", Role.ROLE_CHIEF_BANKING_OFFICER, null, null, null, "Tewodros Chief Banking Officer");
        seedUser("coo", "coo@dashenbank.com", "password123", Role.ROLE_CHIEF_OPERATIONS_OFFICER, null, null, null, "Martha Chief Operations Officer");
        seedUser("execcom", "execcom@dashenbank.com", "password123", Role.ROLE_EXECUTIVE_COMMITTEE, null, null, null, "Dawit Executive Committee Member");
        seedUser("ceo", "ceo@dashenbank.com", "password123", Role.ROLE_CEO_OFFICE, null, null, null, "Dr. Yonas CEO Office");

        // Seed Simulated Core Banking Customers
        seedCustomer("1234567890123", "CIF10001", "Abyssinia Corporates", "info@abyssinia.com", "+251912345678",
                "Corporate", "None", "LOW", true);
        seedCustomer("5555666677778", "CIF10002", "Abebe Bekele", "abebe.b@gmail.com", "+251911223344", "Retail",
                "Pensioner", "LOW", false);
        seedCustomer("8888999900000", "CIF10003", "Negash Welde", "negash.w@gmail.com", "+251915556677", "Retail",
                "Standard", "High Risk", false);
        seedCustomer("1111222233334", "CIF10004", "Tigist Girma", "tigist.g@gmail.com", "+251919998877", "Retail",
                "Standard", "LOW", false);
    }

    private void seedUser(String username, String email, String password, Role role, String district, String branch, String department, String fullName) {
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) {
            user = User.builder()
                    .username(username)
                    .email(email)
                    .role(role)
                    .enabled(true)
                    .district(district)
                    .branch(branch)
                    .department(department)
                    .fullName(fullName)
                    .build();
            System.out.println("Seeding new user: " + username);
        } else {
            System.out.println("Updating existing user: " + username);
            user.setDistrict(district);
            user.setBranch(branch);
            user.setDepartment(department);
            user.setFullName(fullName);
        }

        user.setPassword(passwordEncoder.encode(password));
        userRepository.save(user);
    }

    private void seedCustomer(String accountNumber, String cifNumber, String name, String email, String phoneNumber,
            String segment, String subSegment, String riskRating, boolean isVip) {
        Customer customer = customerRepository.findByAccountNumber(accountNumber).orElse(null);
        if (customer == null) {
            customer = Customer.builder()
                    .accountNumber(accountNumber)
                    .cifNumber(cifNumber)
                    .name(name)
                    .email(email)
                    .phoneNumber(phoneNumber)
                    .customerSegment(segment)
                    .customerSubSegment(subSegment)
                    .riskRating(riskRating)
                    .isVip(isVip)
                    .customerType("RETAIL")
                    .customerSince(LocalDate.now().minusYears(2))
                    .relationshipManager("Relationship Manager " + name)
                    .build();
            System.out.println("Seeding new simulated customer: " + name);
            customerRepository.save(customer);
        }
    }
}
