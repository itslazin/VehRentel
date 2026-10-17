package com.thrissurvehirental.controller;

import com.thrissurvehirental.model.Customer;
import com.thrissurvehirental.model.RentalShop;
import com.thrissurvehirental.model.Vehicle;
import com.thrissurvehirental.service.CustomerService;
import com.thrissurvehirental.service.ShopService;
import com.thrissurvehirental.service.VehicleService;
import com.thrissurvehirental.repository.AdminRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PublicController {

    private final VehicleService vehicleService;
    private final CustomerService customerService;
    private final ShopService shopService;
    private final PasswordEncoder passwordEncoder;
    private final AdminRepository adminRepository;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public PublicController(VehicleService vehicleService, CustomerService customerService,
                           ShopService shopService, PasswordEncoder passwordEncoder,
                           AdminRepository adminRepository,
                           AuthenticationManager authenticationManager,
                           SecurityContextRepository securityContextRepository) {
        this.vehicleService = vehicleService;
        this.customerService = customerService;
        this.shopService = shopService;
        this.passwordEncoder = passwordEncoder;
        this.adminRepository = adminRepository;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("message", "Thrissur Vehicle Rental API is running");
        return response;
    }

    @GetMapping("/auth/me")
    public ResponseEntity<?> currentIdentity(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Authentication required"));
        }
        String role = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .findFirst()
            .map(value -> value.startsWith("ROLE_") ? value.substring(5) : value)
            .map(value -> "ADMIN".equals(value) ? "PLATFORM_ADMIN" : value)
            .orElse("UNKNOWN");
        Map<String, Object> identity = new HashMap<>();
        identity.put("authenticated", true);
        identity.put("username", authentication.getName());
        identity.put("role", role);
        if ("CUSTOMER".equals(role)) {
            Customer customer = customerService.findByUsernameOrEmail(authentication.getName());
            if (customer != null) {
                identity.put("customerId", customer.getCustomerId());
                identity.put("email", customer.getEmail());
            }
        } else if ("SHOP_OWNER".equals(role)) {
            RentalShop shop = shopService.findByUsernameOrEmail(authentication.getName());
            if (shop != null) {
                identity.put("shopId", shop.getShopId());
                identity.put("email", shop.getEmail());
            }
        } else if ("PLATFORM_ADMIN".equals(role)) {
            var admin = adminRepository.findByEmail(authentication.getName());
            if (admin != null) {
                identity.put("adminId", admin.getAdminId());
                identity.put("email", admin.getEmail());
            }
        }
        return ResponseEntity.ok(identity);
    }

    @GetMapping("/auth/csrf")
    public CsrfToken csrf(CsrfToken token) {
        return token;
    }

    @GetMapping("/public/vehicles")
    public List<Map<String, Object>> publicVehicles() {
        return vehicleService.getPublicVehicleSummaries();
    }

    @GetMapping("/public/shops/{shopId}/vehicles")
    public ResponseEntity<?> publicShopVehicles(@PathVariable Long shopId) {
        if (shopId == null || shopId <= 0 || shopService.findById(shopId) == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(vehicleService.getPublicVehicleSummariesByShop(shopId));
    }

    @GetMapping("/public/vehicle/{id}")
    public ResponseEntity<?> getVehicle(@PathVariable Long id) {
        Vehicle vehicle = vehicleService.getPublicVehicleById(id);
        if (vehicle == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(publicVehicle(vehicle));
    }

    @GetMapping("/public/shops")
    public List<Map<String, Object>> getShops() {
        return shopService.getAllShops().stream()
            .filter(shop -> "APPROVED".equalsIgnoreCase(shop.getStatus())
                || "ACTIVE".equalsIgnoreCase(shop.getStatus()))
            .map(shop -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("shopId", shop.getShopId());
                item.put("shopName", shop.getShopName());
                item.put("ownerName", shop.getOwnerName());
                item.put("area", shop.getArea());
                item.put("address", shop.getAddress());
                item.put("mobile", shop.getMobile());
                item.put("status", shop.getStatus());
                return item;
            }).toList();
    }

    private Map<String, Object> publicVehicle(Vehicle vehicle) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("vehicleId", vehicle.getVehicleId());
        item.put("vehicleName", vehicle.getVehicleName());
        item.put("brand", vehicle.getBrand());
        item.put("model", vehicle.getModel());
        item.put("rentPerDay", vehicle.getRentPerDay());
        item.put("imagePath", vehicle.getImagePath());
        item.put("vehicleStatus", vehicle.getVehicleStatus());
        item.put("vehicleType", vehicle.getVehicleType());
        item.put("shop", Map.of("shopId", vehicle.getShop().getShopId(),
            "shopName", vehicle.getShop().getShopName(), "area", vehicle.getShop().getArea()));
        return item;
    }

    @PostMapping("/auth/customer/register")
    public ResponseEntity<?> registerCustomer(@RequestBody Customer customer) {
        try {
            Customer saved = customerService.register(customer);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "customerId", saved.getCustomerId(), "username", saved.getUsername(),
                "email", saved.getEmail(), "role", "CUSTOMER"));
        } catch (IllegalArgumentException | DataIntegrityViolationException e) {
            Map<String, String> error = new HashMap<>();
            String message = e instanceof DataIntegrityViolationException
                ? "Username or email already exists. Please choose another value."
                : e.getMessage();
            error.put("message", message);
            return ResponseEntity.status(message.toLowerCase().contains("already exists")
                ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/auth/shop/register")
    public ResponseEntity<?> registerShop(@RequestBody RentalShop shop) {
        try {
            RentalShop saved = shopService.registerShop(shop);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "shopId", saved.getShopId(), "username", saved.getUsername(),
                "email", saved.getEmail(), "status", saved.getStatus()));
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PostMapping("/auth/customer/login")
    public ResponseEntity<?> loginCustomer(@RequestBody Map<String, String> payload,
                                           HttpServletRequest request, HttpServletResponse response) {
        return login(payload, "CUSTOMER", request, response);
    }

    @PostMapping("/auth/shop/login")
    public ResponseEntity<?> loginShop(@RequestBody Map<String, String> payload,
                                       HttpServletRequest request, HttpServletResponse response) {
        return login(payload, "SHOP_OWNER", request, response);
    }

    @PostMapping("/auth/admin/login")
    public ResponseEntity<?> loginAdmin(@RequestBody Map<String, String> payload,
                                        HttpServletRequest request, HttpServletResponse response) {
        return login(payload, "PLATFORM_ADMIN", request, response);
    }

    private ResponseEntity<?> login(Map<String, String> payload, String expectedRole,
                                    HttpServletRequest request, HttpServletResponse response) {
        String username = payload.get("username");
        String password = payload.get("password");
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username and password are required"));
        }
        try {
            var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(username, password));
            String actualRole = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .map(value -> value.startsWith("ROLE_") ? value.substring(5) : value)
                .orElse("");
            if ("ADMIN".equals(actualRole)) actualRole = "PLATFORM_ADMIN";
            if (!expectedRole.equals(actualRole)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid credentials for this account type"));
            }
            if ("SHOP_OWNER".equals(expectedRole)) {
                RentalShop shop = shopService.findByUsernameOrEmail(username);
                String status = shop == null ? "" : shop.getStatus();
                if ("PENDING".equalsIgnoreCase(status)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message",
                        "Your shop registration is waiting for admin approval."));
                }
                if ("REJECTED".equalsIgnoreCase(status) || "SUSPENDED".equalsIgnoreCase(status)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message",
                        "Your shop account is not currently allowed to sign in."));
                }
            }
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);
            return ResponseEntity.ok(Map.of("role", expectedRole, "username", authentication.getName()));
        } catch (org.springframework.security.core.AuthenticationException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid credentials"));
        }
    }
}
