package com.thrissurvehirental.service;

import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.Rental;
import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.repository.RentalRepository;
import com.thrissurvehirental.repository.VehicleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class RentalService {

    private final RentalRepository rentalRepository;
    private final VehicleRepository vehicleRepository;

    public RentalService(RentalRepository rentalRepository, VehicleRepository vehicleRepository) {
        this.rentalRepository = rentalRepository;
        this.vehicleRepository = vehicleRepository;
    }

    public List<Rental> getByCustomer(Long customerId) {
        return rentalRepository.findByCustomer_CustomerId(customerId);
    }

    public List<Rental> getByShop(Long shopId) {
        return rentalRepository.findByShop_ShopId(shopId);
    }

    public Rental save(Rental rental) {
        return rentalRepository.save(rental);
    }

    public Rental getById(Long rentalId) {
        return rentalRepository.findById(rentalId).orElse(null);
    }

    @Transactional
    public Rental requestReturn(Long rentalId, Long customerId) {
        Rental rental = rentalRepository.findById(rentalId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rental not found"));
        if (rental.getCustomer() == null || !customerId.equals(rental.getCustomer().getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not authorized to request a return for this rental");
        }
        if (!"ACTIVE".equals(rental.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only active rentals can have a return request");
        }
        rental.setStatus("RETURN_REQUESTED");
        rental.setReturnMarkedBy("CUSTOMER_REQUESTED");
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental completeReturn(Long rentalId, Long shopId) {
        Rental rental = rentalRepository.findById(rentalId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (rental.getShop() == null || !shopId.equals(rental.getShop().getShopId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not authorized to complete this rental");
        }
        if (!"ACTIVE".equals(rental.getStatus())
            && !"RETURN_REQUESTED".equals(rental.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only active or return-requested rentals can be marked as returned");
        }

        boolean customerRequested = "RETURN_REQUESTED".equals(rental.getStatus())
            || "CUSTOMER_REQUESTED".equals(rental.getReturnMarkedBy());
        LocalDate actualReturn = LocalDate.now();
        rental.setActualReturnDate(actualReturn);
        rental.setLateDays(0);
        rental.setLateCharge(0.0);
        rental.setFinalAmount(rental.getEstimatedAmount());
        rental.setStatus("COMPLETED");
        rental.setReturnMarkedBy(customerRequested ? "CUSTOMER_REQUESTED" : "SHOP_OWNER_DIRECT");

        Vehicle vehicle = rental.getVehicle();
        if (vehicle != null
            && !rentalRepository.existsOtherConflictingRental(vehicle.getVehicleId(), rentalId)) {
            vehicle.setVehicleStatus("AVAILABLE");
            vehicleRepository.save(vehicle);
        }
        return rentalRepository.save(rental);
    }

    @Transactional
    public Rental cancelPendingBooking(Long rentalId, Long shopId) {
        Rental rental = rentalRepository.findById(rentalId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (rental.getShop() == null || !shopId.equals(rental.getShop().getShopId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You are not authorized to cancel this booking");
        }
        if (!"PENDING_VERIFICATION".equals(rental.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Only pending verification bookings can be cancelled");
        }

        rental.setStatus("CANCELLED");
        Rental saved = rentalRepository.save(rental);
        Vehicle vehicle = rental.getVehicle();
        if (vehicle != null
            && !rentalRepository.existsOtherConflictingRental(vehicle.getVehicleId(), rentalId)) {
            vehicle.setVehicleStatus("AVAILABLE");
            vehicleRepository.save(vehicle);
        }
        return saved;
    }

    public List<Rental> getAll() {
        return rentalRepository.findAll();
    }

    public long count() {
        return rentalRepository.count();
    }

    public long countByStatus(String status) {
        return rentalRepository.findByStatus(status).size();
    }

    public boolean hasOverlap(Vehicle vehicle, LocalDate start, LocalDate end) {
        List<Rental> existing = rentalRepository.findConflictingRentals(vehicle.getVehicleId());
        for (Rental r : existing) {
            LocalDate existingStart = r.getStartDate();
            LocalDate existingEnd = r.getExpectedReturnDate();
            if (!end.isBefore(existingStart) && !start.isAfter(existingEnd)) {
                return true;
            }
        }
        return false;
    }

    public Rental calculateRental(Rental rental) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(rental.getStartDate(), rental.getExpectedReturnDate());
        if (days <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Return date must be at least one day after the pickup date.");
        }
        double amount = days * rental.getRentPerDay();
        rental.setRentalDays((int) days);
        rental.setEstimatedAmount(amount);
        rental.setFinalAmount(amount);
        return rental;
    }
}
