package com.thrissurvehirental.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendController {

    @GetMapping({
        "/shop/register", "/shop/login", "/shop/dashboard", "/shop/profile",
        "/shop/vehicles", "/shop/bookings", "/shop/customers", "/shop/reports",
        "/login", "/register", "/vehicles", "/shops", "/about", "/contact", "/help"
    })
    public String forwardToSpa() {
        return "forward:/index.html";
    }
}
