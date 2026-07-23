package org.lpu.dev.codes.security;

import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTUtil {

    private static final String SECRET =
            "mySecretKeyForLpuReservationSystem2026VeryLongSecret";

    /** Default session: 2 hours. */
    private static final long SESSION_TTL_MS = 2L * 60 * 60 * 1000;
    /** Remember-me session: 30 days. */
    private static final long REMEMBER_TTL_MS = 30L * 24 * 60 * 60 * 1000;

    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());

    // =========================
    // GENERATE TOKEN
    // =========================
    public String generateToken(String username, String role) {
        return generateToken(username, role, false);
    }

    public String generateToken(String username, String role, boolean rememberMe) {
        long ttl = rememberMe ? REMEMBER_TTL_MS : SESSION_TTL_MS;
        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .claim("rememberMe", rememberMe)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ttl))
                .signWith(key)
                .compact();
    }

    // =========================
    // VALIDATE TOKEN
    // =========================
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(cleanToken(token));

            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // =========================
    // GET USERNAME (SUBJECT)
    // =========================
    public String getUsername(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(cleanToken(token))
                    .getBody();

            return claims.getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    // =========================
    // GET ROLE
    // =========================
    public String getRole(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(cleanToken(token))
                    .getBody();

            return claims.get("role", String.class);
        } catch (Exception e) {
            return null;
        }
    }

    // =========================
    // CLEAN "Bearer " PREFIX
    // =========================
    private String cleanToken(String token) {
        if (token == null) return null;
        return token.startsWith("LpuL ") ? token.substring(7) : token;
    }
}