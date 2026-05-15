package com.example.flowable_demo.config;

import com.example.flowable_demo.model.Role;
import com.example.flowable_demo.model.User;
import com.example.flowable_demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedUser("tseday", "tseday@dashenbank.com", "password123", Role.ROLE_BRANCH_STAFF);
        seedUser("eyoda", "eyoda@dashenbank.com", "password123", Role.ROLE_CMD_OFFICER);
        seedUser("musie", "musie@dashenbank.com", "password123", Role.ROLE_AUDIT_TEAM);
        seedUser("selam", "selam@dashenbank.com", "password123", Role.ROLE_DEPARTMENT_WORKUNIT);
        seedUser("lidiya", "lidiya@dashenbank.com", "password123", Role.ROLE_SERVICE_QUALITY);
        seedUser("admin", "admin@dashenbank.com", "admin123", Role.ROLE_ADMIN);
    }

    private void seedUser(String username, String email, String password, Role role) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            user = User.builder()
                    .username(username)
                    .email(email)
                    .role(role)
                    .enabled(true)
                    .build();
            System.out.println("Seeding new user: " + username);
        } else {
            System.out.println("Updating existing user: " + username);
        }
        
        user.setPassword(passwordEncoder.encode(password));
        userRepository.save(user);
    }
}
