package com.thrissurvehirental.repository;

import com.thrissurvehirental.model.RentalShop;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RentalShopRepository extends JpaRepository<RentalShop, Long> {
    RentalShop findByUsername(String username);
    RentalShop findByEmail(String email);
    List<RentalShop> findByStatus(String status);
}
