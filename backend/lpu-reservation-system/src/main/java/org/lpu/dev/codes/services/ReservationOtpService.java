package org.lpu.dev.codes.services;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.security.JWTUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ReservationOtpService {

    private static final Logger logger = LogManager.getLogger(ReservationOtpService.class);
    private static final long CODE_TTL_SECONDS = 10 * 60;
    private static final long TOKEN_TTL_SECONDS = 15 * 60;
    private static final long RESEND_COOLDOWN_SECONDS = 30;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final ConcurrentHashMap<String, CodeEntry> codes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TokenEntry> tokens = new ConcurrentHashMap<>();

    @Autowired private ReservationOtpEmailService emailService;
    @Autowired private JWTUtil jwtUtil;
    @Autowired private AuthenticationService authService;
    @Autowired private RoleAccessService roleAccessService;

    public String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    public synchronized void sendCode(String rawEmail, String contactPerson) {
        cleanup();
        String email = normalizeEmail(rawEmail);
        if (email.isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("A valid contact email is required");
        }

        CodeEntry existing = codes.get(email);
        long now = Instant.now().getEpochSecond();
        if (existing != null && now - existing.sentAt < RESEND_COOLDOWN_SECONDS) {
            throw new IllegalStateException("Please wait a moment before requesting another code");
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        codes.put(email, new CodeEntry(code, now, 0));
        emailService.sendOtpEmail(email, contactPerson, code);
        logger.info("Reservation OTP issued for {}", email);
    }

    public synchronized String verifyCode(String rawEmail, String rawCode) {
        cleanup();
        String email = normalizeEmail(rawEmail);
        String code = rawCode == null ? "" : rawCode.trim();
        CodeEntry entry = codes.get(email);
        if (entry == null) {
            throw new IllegalArgumentException("No verification code found. Please request a new one.");
        }
        long now = Instant.now().getEpochSecond();
        if (now - entry.sentAt > CODE_TTL_SECONDS) {
            codes.remove(email);
            throw new IllegalArgumentException("Verification code expired. Please request a new one.");
        }
        if (entry.attempts >= MAX_ATTEMPTS) {
            codes.remove(email);
            throw new IllegalArgumentException("Too many invalid attempts. Please request a new code.");
        }
        if (!entry.code.equals(code)) {
            entry.attempts += 1;
            throw new IllegalArgumentException("Invalid verification code");
        }

        codes.remove(email);
        String token = UUID.randomUUID().toString().replace("-", "");
        tokens.put(token, new TokenEntry(email, now));
        return token;
    }

    /** Consume a one-time verification token for the given email. */
    public synchronized boolean consumeToken(String token, String rawEmail) {
        cleanup();
        if (token == null || token.isBlank()) return false;
        TokenEntry entry = tokens.remove(token.trim());
        if (entry == null) return false;
        long now = Instant.now().getEpochSecond();
        if (now - entry.createdAt > TOKEN_TTL_SECONDS) return false;
        return entry.email.equals(normalizeEmail(rawEmail));
    }

    /**
     * Staff booking via admin UI sends Authorization: LpuL … and may skip OTP.
     */
    public boolean isStaffBypass(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("LpuL ")) return false;
        String token = authHeader.substring(5);
        if (!jwtUtil.validateToken(token)) return false;
        String role = jwtUtil.getRole(token);
        if (!roleAccessService.roleHasAnyService(role)) {
            return false;
        }
        String username = jwtUtil.getUsername(token);
        return username != null && authService.userActive(username);
    }

    public boolean requireOtpOrStaff(String authHeader, String otpToken, String contactEmail) {
        if (isStaffBypass(authHeader)) return true;
        return consumeToken(otpToken, contactEmail);
    }

    private void cleanup() {
        long now = Instant.now().getEpochSecond();
        Iterator<Map.Entry<String, CodeEntry>> codeIt = codes.entrySet().iterator();
        while (codeIt.hasNext()) {
            Map.Entry<String, CodeEntry> e = codeIt.next();
            if (now - e.getValue().sentAt > CODE_TTL_SECONDS) codeIt.remove();
        }
        Iterator<Map.Entry<String, TokenEntry>> tokenIt = tokens.entrySet().iterator();
        while (tokenIt.hasNext()) {
            Map.Entry<String, TokenEntry> e = tokenIt.next();
            if (now - e.getValue().createdAt > TOKEN_TTL_SECONDS) tokenIt.remove();
        }
    }

    private static final class CodeEntry {
        final String code;
        final long sentAt;
        int attempts;

        CodeEntry(String code, long sentAt, int attempts) {
            this.code = code;
            this.sentAt = sentAt;
            this.attempts = attempts;
        }
    }

    private static final class TokenEntry {
        final String email;
        final long createdAt;

        TokenEntry(String email, long createdAt) {
            this.email = email;
            this.createdAt = createdAt;
        }
    }
}
