package com.example.flowable_demo.controller;

import com.example.flowable_demo.model.Role;
import com.example.flowable_demo.model.User;
import com.example.flowable_demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> req) {
        try {
            String username = (String) req.get("username");
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }

            if (userRepository.findByUsernameIgnoreCase(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
            }

            String roleStr = (String) req.get("role");
            Role role = Role.valueOf(roleStr);

            String rawPassword = (String) req.getOrDefault("password", "password123");

            User user = User.builder()
                    .username(username.trim().toLowerCase())
                    .email((String) req.getOrDefault("email", username + "@dashenbank.com"))
                    .password(passwordEncoder.encode(rawPassword))
                    .role(role)
                    .fullName((String) req.getOrDefault("fullName", username))
                    .district((String) req.get("district"))
                    .branch((String) req.get("branch"))
                    .department((String) req.get("department"))
                    .enabled(req.get("enabled") != null ? (Boolean) req.get("enabled") : true)
                    .build();

            User saved = userRepository.save(user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to create user: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        return userRepository.findById(id).map(user -> {
            if (req.containsKey("fullName")) user.setFullName((String) req.get("fullName"));
            if (req.containsKey("email")) user.setEmail((String) req.get("email"));
            if (req.containsKey("role")) {
                try {
                    user.setRole(Role.valueOf((String) req.get("role")));
                } catch (Exception ignored) {}
            }
            if (req.containsKey("enabled")) user.setEnabled((Boolean) req.get("enabled"));
            if (req.containsKey("district")) user.setDistrict((String) req.get("district"));
            if (req.containsKey("branch")) user.setBranch((String) req.get("branch"));
            if (req.containsKey("department")) user.setDepartment((String) req.get("department"));
            if (req.containsKey("password") && req.get("password") != null && !((String) req.get("password")).isBlank()) {
                user.setPassword(passwordEncoder.encode((String) req.get("password")));
            }
            User updated = userRepository.save(user);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setEnabled(!user.isEnabled());
            User updated = userRepository.save(user);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
