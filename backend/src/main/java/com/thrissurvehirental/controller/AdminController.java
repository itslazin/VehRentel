package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.service.AdminService;
import com.thrissurvehirental.service.ShopService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.thrissurvehirental.repository.RentalRepository;
import com.thrissurvehirental.repository.VehicleRepository;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final ShopService shopService;
    private final RentalRepository rentalRepository;
    private final VehicleRepository vehicleRepository;

    public AdminController(AdminService adminService, ShopService shopService,
                           RentalRepository rentalRepository, VehicleRepository vehicleRepository) {
        this.adminService = adminService;
        this.shopService = shopService;
        this.rentalRepository = rentalRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        Map<String, Object> response = new HashMap<>();
        response.put("statistics", adminService.statistics());
        response.put("pendingShops", adminService.getPendingShops());
        response.put("approvedShops", adminService.getApprovedShops());
        response.put("rejectedShops", adminService.getRejectedShops());
        response.put("suspendedShops", adminService.getSuspendedShops());
        return response;
    }

    @GetMapping("/shops")
    public List<RentalShop> getShops() {
        return adminService.getAllShops();
    }

    @GetMapping("/vehicles")
    public List<?> getVehicles() {
        return adminService.getAllVehicles();
    }

    @GetMapping("/customers")
    public List<?> getCustomers() {
        return adminService.getAllCustomers();
    }

    @GetMapping("/bookings")
    public List<?> getBookings() {
        return adminService.getAllRentals();
    }

    @GetMapping("/rentals")
    public List<?> getRentals() {
        return adminService.getAllRentals();
    }

    @GetMapping("/reports")
    public Map<String, Object> reports() {
        Map<String, Object> reports = new HashMap<>();
        reports.put("statistics", adminService.statistics());
        reports.put("rentalStatuses", Map.of(
            "pendingVerification", adminService.getAllRentals().stream().filter(r -> "PENDING_VERIFICATION".equals(r.getStatus())).count(),
            "active", adminService.getAllRentals().stream().filter(r -> "ACTIVE".equals(r.getStatus())).count(),
            "returnRequested", adminService.getAllRentals().stream().filter(r -> "RETURN_REQUESTED".equals(r.getStatus())).count(),
            "completed", adminService.getAllRentals().stream().filter(r -> "COMPLETED".equals(r.getStatus())).count(),
            "cancelled", adminService.getAllRentals().stream().filter(r -> "CANCELLED".equals(r.getStatus())).count()
        ));
        return reports;
    }

    @PostMapping("/shops/{shopId}/approve")
    public ResponseEntity<RentalShop> approve(@PathVariable Long shopId) {
        RentalShop shop = shopService.findById(shopId);
        if (shop == null) return ResponseEntity.notFound().build();
        shop.setStatus("APPROVED");
        shop.setRejectionReason(null);
        shop.setSuspensionReason(null);
        return ResponseEntity.ok(shopService.save(shop));
    }

    @PostMapping("/shops/{shopId}/reject")
    public ResponseEntity<RentalShop> reject(@PathVariable Long shopId, @RequestBody Map<String, String> payload) {
        RentalShop shop = shopService.findById(shopId);
        if (shop == null) return ResponseEntity.notFound().build();
        shop.setStatus("REJECTED");
        shop.setRejectionReason(payload.getOrDefault("reason", "Not provided"));
        return ResponseEntity.ok(shopService.save(shop));
    }

    @PostMapping("/shops/{shopId}/suspend")
    public ResponseEntity<RentalShop> suspend(@PathVariable Long shopId, @RequestBody Map<String, String> payload) {
        RentalShop shop = shopService.findById(shopId);
        if (shop == null) return ResponseEntity.notFound().build();
        shop.setStatus("SUSPENDED");
        shop.setSuspensionReason(payload.getOrDefault("reason", "Suspended by platform admin"));
        return ResponseEntity.ok(shopService.save(shop));
    }

    @PostMapping("/shops/{shopId}/reactivate")
    public ResponseEntity<RentalShop> reactivate(@PathVariable Long shopId) {
        RentalShop shop = shopService.findById(shopId);
        if (shop == null) return ResponseEntity.notFound().build();
        shop.setStatus("ACTIVE");
        shop.setSuspensionReason(null);
        return ResponseEntity.ok(shopService.save(shop));
    }

    @DeleteMapping("/shops/{shopId}")
    public ResponseEntity<?> delete(@PathVariable Long shopId) {
        if (!shopService.deleteShop(shopId, rentalRepository, vehicleRepository)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("message", "Shop deleted successfully", "shopId", shopId));
    }
}
