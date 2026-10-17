package com.thrissurvehirental.repository;

import com.thrissurvehirental.model.Rental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findByCustomer_CustomerId(Long customerId);
    List<Rental> findByShop_ShopId(Long shopId);
    long deleteByShop_ShopId(Long shopId);

    @Query("SELECT r FROM Rental r WHERE r.vehicle.vehicleId = :vehicleId AND r.status IN ('PENDING_VERIFICATION','ACTIVE','RETURN_REQUESTED')")
    List<Rental> findConflictingRentals(@Param("vehicleId") Long vehicleId);

    @Query("SELECT COUNT(r) > 0 FROM Rental r WHERE r.vehicle.vehicleId = :vehicleId AND r.rentalId <> :rentalId AND r.status IN ('PENDING_VERIFICATION','ACTIVE','RETURN_REQUESTED')")
    boolean existsOtherConflictingRental(@Param("vehicleId") Long vehicleId, @Param("rentalId") Long rentalId);

    @Query("SELECT r FROM Rental r WHERE r.shop.shopId = :shopId AND r.status = :status")
    List<Rental> findByShopIdAndStatus(@Param("shopId") Long shopId, @Param("status") String status);

    @Query("SELECT r FROM Rental r WHERE r.status = :status")
    List<Rental> findByStatus(@Param("status") String status);

    @Query("SELECT r FROM Rental r WHERE r.rentalId IS NOT NULL")
    List<Rental> findAllRentals();

    @Query("SELECT r FROM Rental r WHERE r.customer.customerId = :customerId AND r.status IN ('PENDING_VERIFICATION','ACTIVE','RETURN_REQUESTED')")
    List<Rental> findActiveByCustomer(@Param("customerId") Long customerId);
}
