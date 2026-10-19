package com.thrissurvehirental.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PingController {

    @GetMapping("/api/public/ping")
    public String ping() {
        return "ok";
    }
}