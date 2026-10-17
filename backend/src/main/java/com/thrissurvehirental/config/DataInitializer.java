package com.thrissurvehirental.config;

import com.thrissurvehirental.model.PlatformAdmin;
import com.thrissurvehirental.repository.AdminRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner seedAdmin(AdminRepository adminRepository,
                                       PasswordEncoder passwordEncoder,
                                       @Value("${app.bootstrap-admin.enabled:false}") boolean enabled,
                                       @Value("${app.bootstrap-admin.email:}") String email,
                                       @Value("${app.bootstrap-admin.password:}") String password) {
        return args -> {
            if (!enabled) {
                return;
            }
            if (email.isBlank() || password.isBlank()) {
                throw new IllegalStateException(
                    "Admin bootstrap is enabled but app.bootstrap-admin.email/password are missing");
            }
            if (adminRepository.findByEmail(email) != null) {
                return;
            }
            PlatformAdmin admin = new PlatformAdmin();
            admin.setEmail(email);
            admin.setPassword(passwordEncoder.encode(password));
            admin.setRole("PLATFORM_ADMIN");
            adminRepository.save(admin);
        };
    }
}
