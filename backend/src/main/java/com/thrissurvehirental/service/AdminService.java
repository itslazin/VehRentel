package com.thrissurvehirental.service;

import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.repository.RentalShopRepository;
import com.thrissurvehirental.repository.CustomerRepository;
import com.thrissurvehirental.repository.RentalRepository;
import com.thrissurvehirental.repository.VehicleRepository;
import com.thrissurvehirental.model.Rental;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

@Service
public class AdminService {

    private final RentalShopRepository rentalShopRepository;
    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;
    private final RentalRepository rentalRepository;

    public AdminService(RentalShopRepository rentalShopRepository,
                        CustomerRepository customerRepository,
                        VehicleRepository vehicleRepository,
                        RentalRepository rentalRepository) {
        this.rentalShopRepository = rentalShopRepository;
        this.customerRepository = customerRepository;
        this.vehicleRepository = vehicleRepository;
        this.rentalRepository = rentalRepository;
    }

    public List<RentalShop> getPendingShops() {
        return rentalShopRepository.findByStatus("PENDING");
    }

    public List<RentalShop> getApprovedShops() {
        return rentalShopRepository.findByStatus("APPROVED");
    }

    public List<RentalShop> getRejectedShops() {
        return rentalShopRepository.findByStatus("REJECTED");
    }

    public List<RentalShop> getSuspendedShops() {
        return rentalShopRepository.findByStatus("SUSPENDED");
    }

    public List<RentalShop> getAllShops() {
        return rentalShopRepository.findAll();
    }

    public Map<String, Long> statistics() {
        Map<String, Long> statistics = new LinkedHashMap<>();
        statistics.put("totalShops", rentalShopRepository.count());
        statistics.put("pendingShops", (long) getPendingShops().size());
        statistics.put("approvedShops", (long) getApprovedShops().size());
        statistics.put("suspendedShops", (long) getSuspendedShops().size());
        statistics.put("totalVehicles", vehicleRepository.count());
        statistics.put("totalCustomers", customerRepository.count());
        statistics.put("totalBookings", rentalRepository.count());
        statistics.put("activeRentals", (long) rentalRepository.findByStatus("ACTIVE").size());
        return statistics;
    }

    public List<Map<String, Object>> getAllVehicles() {
        List<Map<String, Object>> result = new ArrayList<>();
        vehicleRepository.findAll().forEach(vehicle -> {
            Map<String, Object> row = new HashMap<>();
            row.put("vehicleId", vehicle.getVehicleId());
            row.put("vehicleName", vehicle.getVehicleName());
            row.put("brand", vehicle.getBrand());
            row.put("model", vehicle.getModel());
            row.put("rentPerDay", vehicle.getRentPerDay());
            row.put("vehicleStatus", vehicle.getVehicleStatus());
            row.put("imagePath", vehicle.getImagePath());
            row.put("shopId", vehicle.getShop().getShopId());
            row.put("shopName", vehicle.getShop().getShopName());
            result.add(row);
        });
        return result;
    }

    public List<?> getAllCustomers() {
        return customerRepository.findAll();
    }

    public List<Rental> getAllRentals() {
        return rentalRepository.findAll();
    }
}
