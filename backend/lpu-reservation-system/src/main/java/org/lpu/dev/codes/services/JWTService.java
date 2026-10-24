package org.lpu.dev.codes.services;

import java.util.Date;

import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.repository.UserRepository;
import org.lpu.dev.codes.security.JWTUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class JWTService {

    /** Allows a token issued in the same moment as a password or role change. */
    private static final long SESSION_SKEW_MS = 5_000L;

    @Autowired
    private JWTUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    /**
     * Signature, expiry, active account, and session revocation.
     * Role is always the database role, never the claim inside the token.
     */
    public Users authenticate(String token) {
        if (!jwtUtil.validateToken(token)) {
            return null;
        }
        String username = jwtUtil.getUsername(token);
        if (username == null || username.isBlank()) {
            return null;
        }
        Users user = userRepository.findByUsernameIgnoreCase(username);
        if (user == null || user.getStatus() == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            return null;
        }
        Long revokedBefore = user.getSessionInvalidBeforeMs();
        Date issuedAt = jwtUtil.getIssuedAt(token);
        if (revokedBefore != null && issuedAt != null && issuedAt.getTime() + SESSION_SKEW_MS < revokedBefore) {
            return null;
        }
        return user;
    }

    public boolean validateToken(String token) {
        return authenticate(token) != null;
    }

    public String getUsername(String token) {
        Users user = authenticate(token);
        return user == null ? null : user.getUsername();
    }

    public String getRole(String token) {
        Users user = authenticate(token);
        return user == null ? null : user.getRole();
    }
}
