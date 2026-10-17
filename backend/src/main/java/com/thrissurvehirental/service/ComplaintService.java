package com.thrissurvehirental.service;

import com.thrissurvehirental.model.Complaint;
import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.repository.ComplaintRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
public class ComplaintService {
    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);
    private static final Set<String> STATUSES = Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED");
    private static final int MAX_SUBJECT_LENGTH = 255;
    private static final int MAX_DESCRIPTION_LENGTH = 10000;
    private final ComplaintRepository complaintRepository;
    private final JdbcTemplate jdbcTemplate;

    public ComplaintService(ComplaintRepository complaintRepository, JdbcTemplate jdbcTemplate) {
        this.complaintRepository = complaintRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public Complaint create(Customer customer, String subject, String description) {
        return createComplaint(customer, null, subject, description);
    }

    @Transactional
    public Complaint create(RentalShop shop, String subject, String description) {
        return createComplaint(null, shop, subject, description);
    }

    private Complaint createComplaint(Customer customer, RentalShop shop, String subject, String description) {
        if (subject == null || subject.isBlank() || description == null || description.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Subject and description are required");
        }
        if (subject.trim().length() > MAX_SUBJECT_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Subject must be 255 characters or fewer");
        }
        if (description.trim().length() > MAX_DESCRIPTION_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Description must be 10000 characters or fewer");
        }
        if ((customer == null) == (shop == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complaint owner is required");
        }
        Complaint complaint = new Complaint();
        complaint.setCustomer(customer);
        complaint.setShop(shop);
        complaint.setSubject(subject.trim());
        complaint.setDescription(description.trim());
        log.info("Preparing complaint insert ownerType={} customerId={} shopId={} database={}",
            customer == null ? "SHOP_OWNER" : "CUSTOMER",
            customer == null ? null : customer.getCustomerId(),
            shop == null ? null : shop.getShopId(),
            activeDatabase());
        try {
            return complaintRepository.saveAndFlush(complaint);
        } catch (RuntimeException exception) {
            log.error("Unable to persist complaint. Verify the complaints table matches the Complaint entity.",
                exception);
            if (!(exception instanceof DataIntegrityViolationException)) {
                throw exception;
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Complaint could not be saved. Verify the Shop Owner complaints database migration.", exception);
        }
    }

    private String activeDatabase() {
        try {
            return jdbcTemplate.queryForObject("SELECT DATABASE()", String.class);
        } catch (RuntimeException exception) {
            log.warn("Unable to determine active database before complaint insert", exception);
            return "(unknown)";
        }
    }

    public List<Complaint> findForCustomer(Long customerId) {
        return complaintRepository.findByCustomer_CustomerIdOrderByCreatedAtDesc(customerId);
    }

    public List<Complaint> findForShop(Long shopId) {
        return complaintRepository.findByShop_ShopIdOrderByCreatedAtDesc(shopId);
    }

    public List<Complaint> findAll() {
        return complaintRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Complaint update(Long complaintId, String status, String adminResponse) {
        Complaint complaint = complaintRepository.findById(complaintId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Complaint not found"));
        if (status == null || !STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid complaint status");
        }
        complaint.setStatus(status);
        complaint.setAdminResponse(adminResponse == null ? null : adminResponse.trim());
        return complaintRepository.save(complaint);
    }
}
