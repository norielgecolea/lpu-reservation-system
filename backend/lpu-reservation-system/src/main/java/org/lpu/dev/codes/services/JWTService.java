package org.lpu.dev.codes.services;

import org.lpu.dev.codes.security.JWTUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JWTService {

    @Autowired
    private JWTUtil jwtUtil;


    // =========================
    // VALIDATE TOKEN
    // =========================
    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }

    // =========================
    // GET USERNAME
    // =========================
    public String getUsername(String token) {
        return jwtUtil.getUsername(token);
    }

    // =========================
    // GET ROLE
    // =========================
    public String getRole(String token) {
        return jwtUtil.getRole(token);
    }
}