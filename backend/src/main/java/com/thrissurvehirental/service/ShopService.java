package com.thrissurvehirental.service;

import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.repository.RentalShopRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.time.LocalDate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ShopService {

    private final RentalShopRepository rentalShopRepository;
    private final PasswordEncoder passwordEncoder;

    public ShopService(RentalShopRepository rentalShopRepository, PasswordEncoder passwordEncoder) {
        this.rentalShopRepository = rentalShopRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public RentalShop registerShop(RentalShop shop) {
        RentalShop existing = rentalShopRepository.findByUsername(shop.getUsername());
        if (existing != null) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (rentalShopRepository.findByEmail(shop.getEmail()) != null) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (shop.getPassword() == null || shop.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must contain at least 8 characters");
        }
        shop.setPassword(passwordEncoder.encode(shop.getPassword()));
        shop.setStatus("PENDING");
        shop.setRegistrationDate(LocalDate.now());
        return rentalShopRepository.save(shop);
    }

    public List<RentalShop> getAllShops() {
        return rentalShopRepository.findAll();
    }

    public RentalShop findById(Long id) {
        return rentalShopRepository.findById(id).orElse(null);
    }

    public RentalShop findByUsername(String username) {
        return rentalShopRepository.findByUsername(username);
    }

    public RentalShop findByUsernameOrEmail(String identifier) {
        RentalShop shop = rentalShopRepository.findByUsername(identifier);
        return shop != null ? shop : rentalShopRepository.findByEmail(identifier);
    }

    public RentalShop requireAuthenticatedShop(String username) {
        RentalShop shop = findByUsername(username);
        if (shop == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Authenticated shop owner was not found");
        }
        return shop;
    }

    public boolean canManage(RentalShop shop) {
        return "APPROVED".equalsIgnoreCase(shop.getStatus())
            || "ACTIVE".equalsIgnoreCase(shop.getStatus());
    }

    public RentalShop save(RentalShop shop) {
        return rentalShopRepository.save(shop);
    }

    @Transactional
    public boolean deleteShop(Long shopId,
                              com.thrissurvehirental.repository.RentalRepository rentalRepository,
                              com.thrissurvehirental.repository.VehicleRepository vehicleRepository) {
        if (!rentalShopRepository.existsById(shopId)) {
            return false;
        }
        rentalRepository.deleteByShop_ShopId(shopId);
        vehicleRepository.deleteByShop_ShopId(shopId);
        rentalShopRepository.deleteById(shopId);
        return true;
    }
}
