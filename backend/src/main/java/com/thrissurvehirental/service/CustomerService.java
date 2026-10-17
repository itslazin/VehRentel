package com.thrissurvehirental.service;

import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.repository.CustomerRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomerService(CustomerRepository customerRepository, PasswordEncoder passwordEncoder) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public Customer register(Customer customer) {
        if (customer == null || customer.getUsername() == null || customer.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (customerRepository.existsByUsername(customer.getUsername())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (customer.getEmail() != null && !customer.getEmail().isBlank()
            && customerRepository.existsByEmail(customer.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (customer.getPassword() == null || customer.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must contain at least 6 characters");
        }
        if (customer.getName() == null || customer.getName().isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (customer.getMobile() == null || customer.getMobile().isBlank()) {
            throw new IllegalArgumentException("Mobile number is required");
        }
        if (customer.getAddress() == null || customer.getAddress().isBlank()) {
            throw new IllegalArgumentException("Address is required");
        }
        customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        return customerRepository.save(customer);
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer findById(Long id) {
        return customerRepository.findById(id).orElse(null);
    }

    public Customer findByUsername(String username) {
        return customerRepository.findByUsername(username);
    }

    public Customer findByUsernameOrEmail(String identifier) {
        return customerRepository.findByUsernameOrEmail(identifier, identifier);
    }

    public long count() {
        return customerRepository.count();
    }
}
