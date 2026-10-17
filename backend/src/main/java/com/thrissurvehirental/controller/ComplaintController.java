package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.Complaint;
import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.service.ComplaintService;
import com.thrissurvehirental.service.CustomerService;
import com.thrissurvehirental.service.ShopService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ComplaintController {
    private static final Logger log = LoggerFactory.getLogger(ComplaintController.class);
    private final ComplaintService complaintService;
    private final CustomerService customerService;
    private final ShopService shopService;

    public ComplaintController(ComplaintService complaintService, CustomerService customerService,
                               ShopService shopService) {
        this.complaintService = complaintService;
        this.customerService = customerService;
        this.shopService = shopService;
    }

    @PostMapping(value = "/customer/complaints",
                 consumes = "application/json",
                 produces = "application/json")
    public ResponseEntity<Map<String, Object>> create(Authentication authentication,
                                                       @RequestBody Map<String, String> payload) {
        Customer customer = authenticatedCustomer(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(toCustomerView(complaintService.create(
            customer, payload.get("subject"), payload.get("description"))));
    }

    @GetMapping("/customer/complaints")
    public List<Map<String, Object>> customerComplaints(Authentication authentication) {
        Customer customer = authenticatedCustomer(authentication);
        return complaintService.findForCustomer(customer.getCustomerId()).stream().map(this::toCustomerView).toList();
    }

    @PostMapping(value = "/shop/complaints", consumes = "application/json", produces = "application/json")
    public ResponseEntity<Map<String, Object>> createShopComplaint(Authentication authentication,
                                                                    @RequestBody Map<String, String> payload) {
        String principal = authentication == null ? "(none)" : authentication.getName();
        log.info("Shop complaint submission started for principal={}", principal);
        try {
            RentalShop shop = authenticatedShop(authentication);
            log.info("Shop complaint owner resolved for principal={}, shopId={}", principal, shop.getShopId());
            Complaint complaint = complaintService.create(shop, payload.get("subject"), payload.get("description"));
            log.info("Shop complaint persisted for principal={}, shopId={}, complaintId={}",
                principal, shop.getShopId(), complaint.getComplaintId());
            return ResponseEntity.status(HttpStatus.CREATED).body(toShopView(complaint));
        } catch (RuntimeException exception) {
            log.error("Shop complaint submission failed for principal={}", principal, exception);
            throw exception;
        }
    }

    @GetMapping("/shop/complaints")
    public List<Map<String, Object>> shopComplaints(Authentication authentication) {
        RentalShop shop = authenticatedShop(authentication);
        return complaintService.findForShop(shop.getShopId()).stream().map(this::toShopView).toList();
    }

    @GetMapping("/admin/complaints")
    public List<Map<String, Object>> adminComplaints() {
        return complaintService.findAll().stream().map(this::toAdminView).toList();
    }

    @PatchMapping("/admin/complaints/{complaintId}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable Long complaintId,
                                                       @RequestBody Map<String, String> payload) {
        Complaint complaint = complaintService.update(
            complaintId, payload.get("status"), payload.get("adminResponse"));
        return ResponseEntity.ok(toAdminView(complaint));
    }

    private Customer authenticatedCustomer(Authentication authentication) {
        Customer customer = customerService.findByUsernameOrEmail(authentication.getName());
        if (customer == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Customer account not found");
        }
        return customer;
    }

    private RentalShop authenticatedShop(Authentication authentication) {
        return shopService.requireAuthenticatedShop(authentication.getName());
    }

    private Map<String, Object> toCustomerView(Complaint complaint) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("complaintId", complaint.getComplaintId());
        result.put("subject", complaint.getSubject());
        result.put("description", complaint.getDescription());
        result.put("status", complaint.getStatus());
        result.put("adminResponse", complaint.getAdminResponse());
        result.put("createdAt", complaint.getCreatedAt());
        result.put("updatedAt", complaint.getUpdatedAt());
        return result;
    }

    private Map<String, Object> toAdminView(Complaint complaint) {
        Map<String, Object> result = toCustomerView(complaint);
        if (complaint.getShop() != null) {
            result.put("complaintType", "SHOP_OWNER");
            result.put("shopId", complaint.getShop().getShopId());
            result.put("shopName", complaint.getShop().getShopName());
            result.put("shopOwnerName", complaint.getShop().getOwnerName());
            result.put("shopMobile", complaint.getShop().getMobile());
            result.put("shopUsername", complaint.getShop().getUsername());
        } else if (complaint.getCustomer() != null) {
            result.put("complaintType", "CUSTOMER");
            result.put("customerName", complaint.getCustomer().getName());
            result.put("customerMobile", complaint.getCustomer().getMobile());
            result.put("customerUsername", complaint.getCustomer().getUsername());
        } else {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                "Complaint has no valid owner");
        }
        return result;
    }

    private Map<String, Object> toShopView(Complaint complaint) {
        Map<String, Object> result = toCustomerView(complaint);
        result.put("shopId", complaint.getShop().getShopId());
        return result;
    }
}
