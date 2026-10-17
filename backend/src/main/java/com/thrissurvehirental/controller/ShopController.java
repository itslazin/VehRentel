package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.Rental;
import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.model.Bike;
import com.thrissurvehirental.model.Car;
import com.thrissurvehirental.model.Scooter;
import com.thrissurvehirental.repository.RentalRepository;
import com.thrissurvehirental.repository.VehicleRepository;
import com.thrissurvehirental.service.ShopService;
import com.thrissurvehirental.service.RentalService;
import com.thrissurvehirental.service.VehicleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import java.time.LocalDate;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;

@RestController
@RequestMapping("/api/shop")
public class ShopController {

    private final ShopService shopService;
    private final RentalService rentalService;
    private final VehicleService vehicleService;
    private final VehicleRepository vehicleRepository;
    private final RentalRepository rentalRepository;
    private final Path uploadDirectory;

    public ShopController(ShopService shopService,
                          RentalService rentalService,
                          VehicleService vehicleService,
                          VehicleRepository vehicleRepository,
                          RentalRepository rentalRepository,
                          @Value("${app.upload.dir:uploads/vehicles}") String uploadDirectory) {
        this.shopService = shopService;
        this.rentalService = rentalService;
        this.vehicleService = vehicleService;
        this.vehicleRepository = vehicleRepository;
        this.rentalRepository = rentalRepository;
        this.uploadDirectory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> dashboard(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        List<Vehicle> vehicles = vehicleService.getVehiclesByShop(shop.getShopId());
        List<Rental> rentals = rentalRepository.findByShop_ShopId(shop.getShopId());
        Map<String, Object> response = new HashMap<>();
        response.put("shop", shop);
        response.put("vehicles", vehicles);
        response.put("rentals", rentals);
        response.put("totalVehicles", vehicles.size());
        response.put("availableVehicles", countVehicles(vehicles, "AVAILABLE"));
        response.put("maintenanceVehicles", countVehicles(vehicles, "MAINTENANCE"));
        response.put("totalBookings", rentals.size());
        response.put("totalCustomers", rentals.stream()
            .map(rental -> rental.getCustomer().getCustomerId())
            .distinct()
            .count());
        response.put("pendingVerification", countRentals(rentals, "PENDING_VERIFICATION"));
        response.put("activeRentals", countRentals(rentals, "ACTIVE"));
        response.put("returnRequests", countRentals(rentals, "RETURN_REQUESTED"));
        response.put("completedRentals", countRentals(rentals, "COMPLETED"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(Authentication authentication) {
        return ResponseEntity.ok(authenticatedShop(authentication));
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(Authentication authentication, @RequestBody Map<String, String> payload) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        shop.setShopName(payload.getOrDefault("shopName", shop.getShopName()));
        shop.setOwnerName(payload.getOrDefault("ownerName", shop.getOwnerName()));
        shop.setMobile(payload.getOrDefault("mobile", shop.getMobile()));
        shop.setEmail(payload.getOrDefault("email", shop.getEmail()));
        shop.setArea(payload.getOrDefault("area", shop.getArea()));
        shop.setAddress(payload.getOrDefault("address", shop.getAddress()));
        shop.setBusinessLicenseNo(payload.getOrDefault("businessLicenseNo", shop.getBusinessLicenseNo()));
        shop.setOwnerIdProofNo(payload.getOrDefault("ownerIdProofNo", shop.getOwnerIdProofNo()));
        return ResponseEntity.ok(shopService.save(shop));
    }

    @GetMapping("/vehicles")
    public ResponseEntity<?> getVehicles(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        return ResponseEntity.ok(vehicleService.getVehiclesByShop(shop.getShopId()));
    }

    @PostMapping(value = "/vehicles", consumes = "multipart/form-data")
    public ResponseEntity<?> addVehicle(Authentication authentication,
                                        @RequestParam String vehicleName,
                                        @RequestParam String brand,
                                        @RequestParam String model,
                                        @RequestParam String vehicleType,
                                        @RequestParam Double rentPerDay,
                                        @RequestPart(value = "image", required = false) MultipartFile image) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        Vehicle vehicle = switch (vehicleType.toUpperCase()) {
            case "BIKE" -> new Bike();
            case "SCOOTER" -> new Scooter();
            default -> new Car();
        };
        vehicle.setVehicleName(vehicleName);
        vehicle.setBrand(brand);
        vehicle.setModel(model);
        vehicle.setRentPerDay(rentPerDay);
        vehicle.setVehicleId(null);
        vehicle.setShop(shop);
        if (vehicle.getVehicleStatus() == null) {
            vehicle.setVehicleStatus("AVAILABLE");
        }
        if (image != null && !image.isEmpty()) {
            vehicle.setImagePath(storeImage(image));
        }
        return ResponseEntity.ok(vehicleService.saveVehicle(vehicle));
    }

    @PutMapping(value = "/vehicles/{vehicleId}", consumes = "multipart/form-data")
    public ResponseEntity<?> updateVehicle(Authentication authentication,
                                           @PathVariable Long vehicleId,
                                           @RequestParam String vehicleName,
                                           @RequestParam String brand,
                                           @RequestParam String model,
                                           @RequestParam Double rentPerDay,
                                           @RequestPart(value = "image", required = false) MultipartFile image) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        Vehicle vehicle = ownedVehicle(shop, vehicleId);
        if (vehicle == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vehicle not found for this shop"));
        }
        vehicle.setVehicleName(vehicleName);
        vehicle.setBrand(brand);
        vehicle.setModel(model);
        vehicle.setRentPerDay(rentPerDay);
        if (image != null && !image.isEmpty()) {
            vehicle.setImagePath(storeImage(image));
        }
        return ResponseEntity.ok(vehicleService.saveVehicle(vehicle));
    }

    @PatchMapping("/vehicles/{vehicleId}/status")
    public ResponseEntity<?> changeVehicleStatus(Authentication authentication,
                                                 @PathVariable Long vehicleId,
                                                 @RequestBody Map<String, String> payload) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        Vehicle vehicle = ownedVehicle(shop, vehicleId);
        if (vehicle == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vehicle not found for this shop"));
        }
        String status = payload.get("status");
        if (!List.of("AVAILABLE", "MAINTENANCE", "INACTIVE").contains(status)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid vehicle status"));
        }
        vehicle.setVehicleStatus(status);
        return ResponseEntity.ok(vehicleService.saveVehicle(vehicle));
    }

    @PostMapping("/vehicles/{vehicleId}/image")
    public ResponseEntity<?> uploadVehicleImage(Authentication authentication,
                                                @PathVariable Long vehicleId,
                                                @RequestParam("image") MultipartFile image) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }

        Vehicle vehicle = ownedVehicle(shop, vehicleId);
        if (vehicle == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Vehicle not found for this shop"));
        }
        if (image.isEmpty() || image.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("message", "Image must be non-empty and no larger than 5 MB"));
        }
        List<String> allowedTypes = List.of("image/jpeg", "image/png", "image/webp");
        if (!isAllowedImage(image, allowedTypes)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only JPG, PNG and WEBP images are supported"));
        }
        try {
            Files.createDirectories(uploadDirectory);
            String extension = extensionFor(image.getContentType());
            String filename = UUID.randomUUID() + extension;
            Files.write(uploadDirectory.resolve(filename).normalize(), image.getBytes());
            vehicle.setImagePath("/uploads/vehicles/" + filename);
            return ResponseEntity.ok(vehicleService.saveVehicle(vehicle));
        } catch (java.io.IOException exception) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to store vehicle image"));
        }
    }

    private String storeImage(MultipartFile image) {
        if (image.isEmpty() || image.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Image must be non-empty and no larger than 5 MB");
        }
        List<String> allowedTypes = List.of("image/jpeg", "image/png", "image/webp");
        if (!isAllowedImage(image, allowedTypes)) {
            throw new IllegalArgumentException("Only JPG, PNG and WEBP images are supported");
        }
        try {
            Files.createDirectories(uploadDirectory);
            String extension = switch (image.getContentType()) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
            String filename = "vehicle_" + UUID.randomUUID() + extension;
            Files.write(uploadDirectory.resolve(filename).normalize(), image.getBytes());
            return "/uploads/vehicles/" + filename;
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Unable to store vehicle image", exception);
        }
    }

    private boolean isAllowedImage(MultipartFile image, List<String> allowedTypes) {
            if (image == null || image.isEmpty() || image.getSize() > 5 * 1024 * 1024
                || !allowedTypes.contains(image.getContentType())) {
                return false;
            }
            try {
                byte[] bytes = image.getBytes();
                if ("image/jpeg".equals(image.getContentType()) || "image/png".equals(image.getContentType())) {
                    return ImageIO.read(new ByteArrayInputStream(bytes)) != null;
                }
                return bytes.length >= 12
                    && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                    && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';
            } catch (java.io.IOException exception) {
                return false;
            }
        }

    private String extensionFor(String contentType) {
            return switch (contentType) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
    }

    @GetMapping("/bookings")
    public ResponseEntity<?> bookings(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        List<Map<String, Object>> bookings = new ArrayList<>();
        for (Rental rental : rentalRepository.findByShop_ShopId(shop.getShopId())) {
            Map<String, Object> booking = new LinkedHashMap<>();
            booking.put("rentalId", rental.getRentalId());
            booking.put("customerName", rental.getCustomer() == null ? null : rental.getCustomer().getName());
            booking.put("customerMobile", rental.getCustomer() == null ? null : rental.getCustomer().getMobile());
            booking.put("drivingLicenseNo", rental.getCustomer() == null ? null : rental.getCustomer().getDrivingLicenseNo());
            booking.put("vehicleName", rental.getVehicle() == null ? null : rental.getVehicle().getVehicleName());
            booking.put("vehicleType", rental.getVehicle() == null ? null : rental.getVehicle().getClass().getSimpleName().toUpperCase());
            booking.put("startDate", rental.getStartDate());
            booking.put("expectedReturnDate", rental.getExpectedReturnDate());
            booking.put("rentalDays", rental.getRentalDays());
            booking.put("estimatedAmount", rental.getEstimatedAmount());
            booking.put("finalAmount", rental.getFinalAmount());
            booking.put("status", rental.getStatus());
            booking.put("returnMarkedBy", rental.getReturnMarkedBy());
            bookings.add(booking);
        }
        return ResponseEntity.ok(bookings);
    }

    @PatchMapping("/bookings/{rentalId}/status")
    public ResponseEntity<?> updateBookingStatus(Authentication authentication,
                                                 @PathVariable Long rentalId,
                                                 @RequestBody Map<String, String> payload) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        Rental rental = rentalRepository.findById(rentalId).orElse(null);
        if (rental == null || !rental.getShop().getShopId().equals(shop.getShopId())) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Booking not found for this shop"));
        }
        String nextStatus = payload.get("status");
        boolean valid = ("ACTIVE".equals(nextStatus) && "PENDING_VERIFICATION".equals(rental.getStatus()))
            || ("COMPLETED".equals(nextStatus)
                && ("ACTIVE".equals(rental.getStatus()) || "RETURN_REQUESTED".equals(rental.getStatus())));
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid booking status transition"));
        }
        if ("COMPLETED".equals(nextStatus)) {
            return ResponseEntity.ok(
                rentalService.completeReturn(rentalId, shop.getShopId()));
        }
        rental.setStatus(nextStatus);
        return ResponseEntity.ok(rentalRepository.save(rental));
    }

    @PutMapping("/bookings/{rentalId}/cancel")
    public ResponseEntity<?> cancelBooking(Authentication authentication, @PathVariable Long rentalId) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        return ResponseEntity.ok(
            rentalService.cancelPendingBooking(rentalId, shop.getShopId()));
    }

    @GetMapping("/customers")
    public ResponseEntity<?> customers(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        return ResponseEntity.ok(rentalRepository.findByShop_ShopId(shop.getShopId()).stream()
            .map(Rental::getCustomer)
            .distinct()
            .toList());
    }

    @GetMapping("/reports")
    public ResponseEntity<?> reports(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        if (!shopService.canManage(shop)) {
            return statusResponse(shop);
        }
        List<Rental> rentals = rentalRepository.findByShop_ShopId(shop.getShopId());
        List<Vehicle> vehicles = vehicleService.getVehiclesByShop(shop.getShopId());
        return ResponseEntity.ok(Map.of(
            "totalRentals", rentals.size(),
            "activeRentals", countRentals(rentals, "ACTIVE"),
            "completedRentals", countRentals(rentals, "COMPLETED"),
            "cancelledRentals", countRentals(rentals, "CANCELLED"),
            "pendingVerification", countRentals(rentals, "PENDING_VERIFICATION"),
            "returnRequests", countRentals(rentals, "RETURN_REQUESTED"),
            "availableVehicles", countVehicles(vehicles, "AVAILABLE"),
            "maintenanceVehicles", countVehicles(vehicles, "MAINTENANCE"),
            "customers", rentals.stream().map(Rental::getCustomer).distinct().toList()
        ));
    }

    private RentalShop authenticatedShop(Authentication authentication) {
        return shopService.requireAuthenticatedShop(authentication.getName());
    }

    private Vehicle ownedVehicle(RentalShop shop, Long vehicleId) {
        Vehicle vehicle = vehicleService.getVehicleById(vehicleId);
        return vehicle != null && vehicle.getShop().getShopId().equals(shop.getShopId()) ? vehicle : null;
    }

    private ResponseEntity<Map<String, Object>> statusResponse(RentalShop shop) {
        String reason = "SUSPENDED".equals(shop.getStatus()) ? shop.getSuspensionReason() : shop.getRejectionReason();
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
            "status", shop.getStatus(),
            "message", "Shop operations are unavailable for the current status",
            "reason", reason == null ? "No reason provided" : reason
        ));
    }

    private long countVehicles(List<Vehicle> vehicles, String status) {
        return vehicles.stream().filter(vehicle -> status.equals(vehicle.getVehicleStatus())).count();
    }

    private long countRentals(List<Rental> rentals, String status) {
        return rentals.stream().filter(rental -> status.equals(rental.getStatus())).count();
    }
}
