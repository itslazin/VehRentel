package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.Rental;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.service.CustomerService;
import com.thrissurvehirental.service.RentalService;
import com.thrissurvehirental.service.VehicleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/customer")
public class CustomerController {

    private final CustomerService customerService;
    private final VehicleService vehicleService;
    private final RentalService rentalService;

    public CustomerController(CustomerService customerService, VehicleService vehicleService, RentalService rentalService) {
        this.customerService = customerService;
        this.vehicleService = vehicleService;
        this.rentalService = rentalService;
    }

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(Authentication authentication) {
        Customer customer = authenticatedCustomer(authentication);
        Map<String, Object> result = new HashMap<>();
        result.put("customer", customer);
        result.put("availableVehicles", vehicleService.getPublicVisibleVehicles());
        return result;
    }

    @GetMapping("/rentals")
    public List<Rental> getRentals(Authentication authentication) {
        return rentalService.getByCustomer(authenticatedCustomer(authentication).getCustomerId());
    }

    @GetMapping("/bookings")
    public List<Rental> getBookings(Authentication authentication) {
        return rentalService.getByCustomer(authenticatedCustomer(authentication).getCustomerId());
    }

    @PatchMapping("/rentals/{rentalId}/return")
    public ResponseEntity<?> requestReturn(Authentication authentication, @PathVariable Long rentalId) {
        Customer customer = authenticatedCustomer(authentication);
        Rental rental = rentalService.requestReturn(rentalId, customer.getCustomerId());
        return ResponseEntity.ok(Map.of(
            "rentalId", rental.getRentalId(),
            "status", rental.getStatus(),
            "message", "Return request submitted successfully."));
    }

    @GetMapping("/vehicles")
    public List<Vehicle> getVehicles() {
        return vehicleService.getPublicVisibleVehicles();
    }

    private Customer authenticatedCustomer(Authentication authentication) {
        Customer customer = customerService.findByUsernameOrEmail(authentication.getName());
        if (customer == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Customer account not found");
        }
        return customer;
    }
}
