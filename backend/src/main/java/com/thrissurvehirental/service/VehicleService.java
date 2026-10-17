package com.thrissurvehirental.service;

import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    public List<Vehicle> getPublicVisibleVehicles() {
        return vehicleRepository.findAvailablePublicVehicles();
    }

    public List<Map<String, Object>> getPublicVehicleSummaries() {
        return getPublicVehicleSummaries(getPublicVisibleVehicles());
    }

    public List<Map<String, Object>> getPublicVehicleSummariesByShop(Long shopId) {
        return getPublicVehicleSummaries(vehicleRepository.findAvailableByShopId(shopId));
    }

    private List<Map<String, Object>> getPublicVehicleSummaries(List<Vehicle> vehicles) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Vehicle vehicle : vehicles) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("vehicleId", vehicle.getVehicleId());
            item.put("vehicleName", vehicle.getVehicleName());
            item.put("brand", vehicle.getBrand());
            item.put("model", vehicle.getModel());
            item.put("rentPerDay", vehicle.getRentPerDay());
            item.put("imagePath", vehicle.getImagePath());
            item.put("vehicleStatus", vehicle.getVehicleStatus());
            item.put("vehicleType", vehicle.getClass().getSimpleName().toUpperCase());
            if (vehicle.getShop() != null) {
                item.put("shop", Map.of(
                    "shopId", vehicle.getShop().getShopId(),
                    "shopName", vehicle.getShop().getShopName(),
                    "area", vehicle.getShop().getArea()
                ));
            }
            result.add(item);
        }
        return result;
    }

    public List<Vehicle> getVehiclesByShop(Long shopId) {
        return vehicleRepository.findByShop_ShopId(shopId);
    }

    public Vehicle saveVehicle(Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }

    public Vehicle getVehicleById(Long id) {
        return vehicleRepository.findById(id).orElse(null);
    }

    public Vehicle getPublicVehicleById(Long id) {
        return vehicleRepository.findPublicById(id).orElse(null);
    }

    public Optional<Vehicle> findBookableById(Long id) {
        return vehicleRepository.findBookableById(id);
    }

    public void deleteVehicle(Long id) {
        vehicleRepository.deleteById(id);
    }

    public boolean isVehicleAvailableForDates(Vehicle vehicle, java.time.LocalDate startDate, java.time.LocalDate endDate) {
        return "AVAILABLE".equals(vehicle.getVehicleStatus());
    }

    public List<Vehicle> findByStatus(String status) {
        return vehicleRepository.findByVehicleStatus(status);
    }

    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    public long count() {
        return vehicleRepository.count();
    }
}
