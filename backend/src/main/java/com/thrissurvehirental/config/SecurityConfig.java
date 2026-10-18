package com.thrissurvehirental.config;

import com.thrissurvehirental.model.PlatformAdmin;
import com.thrissurvehirental.repository.AdminRepository;
import com.thrissurvehirental.repository.CustomerRepository;
import com.thrissurvehirental.repository.RentalShopRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.util.StringUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final CustomerRepository customerRepository;
    private final RentalShopRepository rentalShopRepository;
    private final AdminRepository adminRepository;

    public SecurityConfig(CustomerRepository customerRepository,
                         RentalShopRepository rentalShopRepository,
                         AdminRepository adminRepository) {
        this.customerRepository = customerRepository;
        this.rentalShopRepository = rentalShopRepository;
        this.adminRepository = adminRepository;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
            .cors(Customizer.withDefaults())
            .securityContext(context -> context.securityContextRepository(securityContextRepository()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/", "/index.html", "/css/**", "/js/**", "/pages/**", "/images/**", "/assets/**", "/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET,
                    "/shop/register", "/shop/login", "/shop/dashboard", "/shop/profile",
                    "/shop/vehicles", "/shop/bookings", "/shop/customers", "/shop/reports",
                    "/login", "/register", "/vehicles", "/shops", "/about", "/contact", "/help"
                ).permitAll()
                .requestMatchers("/h2-console/**").denyAll()
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/auth/csrf", "/api/auth/customer/login", "/api/auth/shop/login",
                    "/api/auth/admin/login", "/api/auth/customer/register", "/api/auth/shop/register").permitAll()
                .requestMatchers("/api/public/**", "/api/health").permitAll()

                // Admin APIs
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Shop-owner APIs
                .requestMatchers("/api/shop/**").hasRole("SHOP_OWNER")

                // Customer APIs
                .requestMatchers("/api/customer/**").hasRole("CUSTOMER")

                // All-rentals endpoint is admin-only
                .requestMatchers(HttpMethod.GET, "/api/rentals").hasRole("ADMIN")

                // Public vehicle catalogue
                .requestMatchers(HttpMethod.GET, "/api/vehicles").permitAll()

                // Explicitly deny any unclassified request
                .anyRequest().denyAll() )
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
            .formLogin(form -> form.disable())
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .permitAll());

        return http.build();
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public AuthenticationManager authenticationManager(PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider customerProvider = new DaoAuthenticationProvider();
        customerProvider.setUserDetailsService(userDetailsService());
        customerProvider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(customerProvider);
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            var customer = customerRepository.findByUsernameOrEmail(username, username);
            if (customer != null) {
                UserDetails user = User.withUsername(customer.getUsername())
                    .password(customer.getPassword())
                    .roles("CUSTOMER")
                    .build();
                return user;
            }

            var shop = rentalShopRepository.findByUsername(username);
            if (shop != null) {
                UserDetails user = User.withUsername(shop.getUsername())
                    .password(shop.getPassword())
                    .roles("SHOP_OWNER")
                    .build();
                return user;
            }

            PlatformAdmin admin = adminRepository.findByEmail(username);
            if (admin != null) {
                UserDetails user = User.withUsername(admin.getEmail())
                    .password(admin.getPassword())
                    .roles("ADMIN")
                    .build();
                return user;
            }

            throw new UsernameNotFoundException("User not found: " + username);
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
        private final CsrfTokenRequestHandler plain = new CsrfTokenRequestAttributeHandler();
        private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

        @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                   Supplier<CsrfToken> csrfToken) {
    xor.handle(request, response, csrfToken);
    csrfToken.get();
}

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
            String headerValue = request.getHeader(csrfToken.getHeaderName());
            return (StringUtils.hasText(headerValue) ? plain : xor)
                .resolveCsrfTokenValue(request, csrfToken);
        }
    }
}
