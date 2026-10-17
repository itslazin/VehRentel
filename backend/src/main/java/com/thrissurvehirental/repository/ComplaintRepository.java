package com.thrissurvehirental.repository;

import com.thrissurvehirental.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByCustomer_CustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Complaint> findByShop_ShopIdOrderByCreatedAtDesc(Long shopId);
    List<Complaint> findAllByOrderByCreatedAtDesc();
}
