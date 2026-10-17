package com.thrissurvehirental.repository;

import com.thrissurvehirental.model.PlatformAdmin;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminRepository extends JpaRepository<PlatformAdmin, Long> {
    PlatformAdmin findByEmail(String email);
}
