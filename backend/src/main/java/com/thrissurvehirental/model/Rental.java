package com.thrissurvehirental.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "rentals")
public class Rental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "rental_id")
    private Long rentalId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vehicle_id", referencedColumnName = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shop_id", nullable = false)
    private RentalShop shop;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "expected_return_date", nullable = false)
    private LocalDate expectedReturnDate;

    @Column(name = "actual_return_date")
    private LocalDate actualReturnDate;

    @Column(name = "rental_days")
    private Integer rentalDays;

    @Column(name = "rent_per_day")
    private Double rentPerDay;

    @Column(name = "estimated_amount")
    private Double estimatedAmount;

    @Column(name = "late_days")
    private Integer lateDays;

    @Column(name = "late_charge")
    private Double lateCharge;

    @Column(name = "final_amount")
    private Double finalAmount;

    @Column(nullable = false)
    private String status = "PENDING_VERIFICATION";

    @Column(name = "return_marked_by", length = 30)
    private String returnMarkedBy;

    public Rental() {}

    public Long getRentalId() { return rentalId; }
    public void setRentalId(Long rentalId) { this.rentalId = rentalId; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public Vehicle getVehicle() { return vehicle; }
    public void setVehicle(Vehicle vehicle) { this.vehicle = vehicle; }
    public RentalShop getShop() { return shop; }
    public void setShop(RentalShop shop) { this.shop = shop; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public void setExpectedReturnDate(LocalDate expectedReturnDate) { this.expectedReturnDate = expectedReturnDate; }
    public LocalDate getActualReturnDate() { return actualReturnDate; }
    public void setActualReturnDate(LocalDate actualReturnDate) { this.actualReturnDate = actualReturnDate; }
    public Integer getRentalDays() { return rentalDays; }
    public void setRentalDays(Integer rentalDays) { this.rentalDays = rentalDays; }
    public Double getRentPerDay() { return rentPerDay; }
    public void setRentPerDay(Double rentPerDay) { this.rentPerDay = rentPerDay; }
    public Double getEstimatedAmount() { return estimatedAmount; }
    public void setEstimatedAmount(Double estimatedAmount) { this.estimatedAmount = estimatedAmount; }
    public Integer getLateDays() { return lateDays; }
    public void setLateDays(Integer lateDays) { this.lateDays = lateDays; }
    public Double getLateCharge() { return lateCharge; }
    public void setLateCharge(Double lateCharge) { this.lateCharge = lateCharge; }
    public Double getFinalAmount() { return finalAmount; }
    public void setFinalAmount(Double finalAmount) { this.finalAmount = finalAmount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReturnMarkedBy() { return returnMarkedBy; }
    public void setReturnMarkedBy(String returnMarkedBy) { this.returnMarkedBy = returnMarkedBy; }
}
