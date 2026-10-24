package org.lpu.dev.codes.security;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.util.Date;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTUtil {

    private static final String PREFIX = "LpuL ";
    /** Default session: 2 hours. */
    private static final long SESSION_TTL_MS = 2L * 60 * 60 * 1000;
    /** Remember-me session: 30 days. */
    private static final long REMEMBER_TTL_MS = 30L * 24 * 60 * 60 * 1000;

    private final Key key;
    private final byte[] secretBytes;

    public JWTUtil() {
        String secret = resolveSecret();
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    private static String resolveSecret() {
        String secret = firstNonBlank(System.getenv("JWT_SECRET"), System.getProperty("JWT_SECRET"));
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be set to a random string of at least 32 characters");
        }
        return secret;
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

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

    public boolean validateToken(String token) {
        return parseClaims(token) != null;
    }

    public String getUsername(String token) {
        Claims claims = parseClaims(token);
        return claims == null ? null : claims.getSubject();
    }

    /**
     * Role stored in the token. Authorization must use the database role, not this claim.
     */
    public String getTokenRole(String token) {
        Claims claims = parseClaims(token);
        return claims == null ? null : claims.get("role", String.class);
    }

    public Date getIssuedAt(String token) {
        Claims claims = parseClaims(token);
        return claims == null ? null : claims.getIssuedAt();
    }

    public boolean isRememberMe(String token) {
        Claims claims = parseClaims(token);
        if (claims == null) {
            return false;
        }
        Boolean remember = claims.get("rememberMe", Boolean.class);
        return Boolean.TRUE.equals(remember);
    }

    public String signSurvey(String facility, long id, int rating) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] sig = mac.doFinal(surveyPayload(facility, id, rating).getBytes(StandardCharsets.UTF_8));
            return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(sig);
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign survey link", e);
        }
    }

    public boolean verifySurvey(String facility, long id, int rating, String token) {
        if (token == null || token.isBlank() || rating < 1 || rating > 5 || id <= 0) {
            return false;
        }
        String expected = signSurvey(facility, id, rating);
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                token.trim().getBytes(StandardCharsets.UTF_8));
    }

    private static String surveyPayload(String facility, long id, int rating) {
        return facility + ":" + id + ":" + rating;
    }

    private Claims parseClaims(String token) {
        try {
            String cleaned = cleanToken(token);
            if (cleaned == null || cleaned.isBlank()) {
                return null;
            }
            return Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(cleaned)
                    .getBody();
        } catch (Exception e) {
            return null;
        }
    }

    private String cleanToken(String token) {
        if (token == null) {
            return null;
        }
        String trimmed = token.trim();
        return trimmed.startsWith(PREFIX) ? trimmed.substring(PREFIX.length()).trim() : trimmed;
    }
}
