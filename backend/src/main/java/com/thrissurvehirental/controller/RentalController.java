package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.Rental;
import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.service.CustomerService;
import com.thrissurvehirental.service.RentalService;
import com.thrissurvehirental.service.VehicleService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api")
public class RentalController {

    private final RentalService rentalService;
    private final VehicleService vehicleService;
    private final CustomerService customerService;

    public RentalController(RentalService rentalService, VehicleService vehicleService, CustomerService customerService) {
        this.rentalService = rentalService;
        this.vehicleService = vehicleService;
        this.customerService = customerService;
    }

    @PostMapping("/customer/book")
    @Transactional
    public ResponseEntity<?> bookVehicle(Authentication authentication, @RequestBody Map<String, Object> request) {
        if (request.get("vehicleId") == null || request.get("startDate") == null || request.get("endDate") == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vehicle and booking dates are required"));
        }
        Long vehicleId;
        LocalDate start;
        LocalDate end;
        try {
            vehicleId = Long.valueOf(request.get("vehicleId").toString());
            start = LocalDate.parse(request.get("startDate").toString());
            end = LocalDate.parse(request.get("endDate").toString());
        } catch (NumberFormatException | DateTimeParseException exception) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid vehicle or booking date"));
        }
        if (!end.isAfter(start)) {
            return ResponseEntity.badRequest().body(
                Map.of("message", "Return date must be at least one day after the pickup date."));
        }
        Vehicle vehicle = vehicleService.findBookableById(vehicleId).orElse(null);
        if (vehicle == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("message", "Vehicle is not currently available for booking"));
        }
        if (rentalService.hasOverlap(vehicle, start, end)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("message", "Vehicle is not available for the selected dates"));
        }

        Rental rental = new Rental();
        Customer customer = customerService.findByUsernameOrEmail(authentication.getName());
        if (customer == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authenticated customer was not found"));
        }
        rental.setCustomer(customer);
        rental.setVehicle(vehicle);
        rental.setShop(vehicle.getShop());
        rental.setStartDate(start);
        rental.setExpectedReturnDate(end);
        rental.setRentPerDay(vehicle.getRentPerDay());
        rental.setStatus("PENDING_VERIFICATION");
        rentalService.calculateRental(rental);
        Rental saved = rentalService.save(rental);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/rentals")
    public List<Rental> getAllRentals() {
        return rentalService.getAll();
    }
}
