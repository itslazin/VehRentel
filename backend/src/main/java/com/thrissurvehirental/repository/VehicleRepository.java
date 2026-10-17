package com.thrissurvehirental.repository;

import com.thrissurvehirental.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByShop_ShopId(Long shopId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vehicle v WHERE v.vehicleId = :vehicleId AND v.shop.status IN ('APPROVED', 'ACTIVE') AND v.vehicleStatus = 'AVAILABLE'")
    Optional<Vehicle> findBookableById(@Param("vehicleId") Long vehicleId);

    @Query("SELECT v FROM Vehicle v WHERE v.vehicleId = :vehicleId AND v.shop.status IN ('APPROVED', 'ACTIVE') AND v.vehicleStatus = 'AVAILABLE'")
    Optional<Vehicle> findPublicById(@Param("vehicleId") Long vehicleId);
    long deleteByShop_ShopId(Long shopId);

    @Query("SELECT v FROM Vehicle v WHERE v.shop.shopId = :shopId AND v.shop.status IN ('APPROVED', 'ACTIVE') AND v.vehicleStatus = 'AVAILABLE'")
    List<Vehicle> findAvailableByShopId(@Param("shopId") Long shopId);

    @Query("SELECT v FROM Vehicle v WHERE v.vehicleStatus = :status")
    List<Vehicle> findByVehicleStatus(@Param("status") String status);

    @Query("SELECT v FROM Vehicle v WHERE v.shop.status IN ('APPROVED', 'ACTIVE') AND v.vehicleStatus = 'AVAILABLE'")
    List<Vehicle> findAvailablePublicVehicles();
}
