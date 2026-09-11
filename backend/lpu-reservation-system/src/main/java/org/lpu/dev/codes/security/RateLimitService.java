package org.lpu.dev.codes.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

import org.springframework.stereotype.Component;

/**
 * In-memory token buckets keyed by hashed session / email / IP.
 * Lost on Tomcat restart — same trade-off as reservation OTP maps.
 */
@Component
public class RateLimitService {

	public static final String MESSAGE = "Too many requests. Please try again shortly.";

	/** Staff JWT: burst 40, sustained 120/min. */
	public static final double SESSION_CAPACITY = 40;
	public static final double SESSION_REFILL_PER_SEC = 2.0;

	/** Public person (email or otp token): burst 8, sustained 15/min. */
	public static final double IDENTITY_CAPACITY = 8;
	public static final double IDENTITY_REFILL_PER_SEC = 0.25;

	/** Shared-ISP backstop: burst 60, sustained 600/min. */
	public static final double IP_CAPACITY = 60;
	public static final double IP_REFILL_PER_SEC = 10.0;

	private static final long IDLE_EVICT_NANOS = 2L * 60 * 1_000_000_000L;

	public record Result(boolean allowed, int retryAfterSeconds) {
		public static Result ok() {
			return new Result(true, 0);
		}

		public static Result limited(int retryAfterSeconds) {
			return new Result(false, Math.max(1, retryAfterSeconds));
		}
	}

	private static final class Bucket {
		private final double capacity;
		private final double refillPerSecond;
		private double tokens;
		private long lastRefillNanos;

		private Bucket(double capacity, double refillPerSecond, long now) {
			this.capacity = capacity;
			this.refillPerSecond = refillPerSecond;
			this.tokens = capacity;
			this.lastRefillNanos = now;
		}
	}

	private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
	private final AtomicLong ops = new AtomicLong();
	private final LongSupplier clock;

	public RateLimitService() {
		this(System::nanoTime);
	}

	RateLimitService(LongSupplier clock) {
		this.clock = clock;
	}

	public Result tryConsume(String key, double capacity, double refillPerSecond) {
		if (key == null || key.isBlank()) {
			return Result.ok();
		}
		maybeCleanup();
		long now = clock.getAsLong();
		Bucket bucket = buckets.computeIfAbsent(key, k -> new Bucket(capacity, refillPerSecond, now));
		synchronized (bucket) {
			refill(bucket, now);
			if (bucket.tokens >= 1.0d) {
				bucket.tokens -= 1.0d;
				return Result.ok();
			}
			double deficit = 1.0d - bucket.tokens;
			int wait = (int) Math.ceil(deficit / bucket.refillPerSecond);
			return Result.limited(wait);
		}
	}

	public String hashed(String prefix, String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
			return prefix + HexFormat.of().formatHex(hash);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 not available", e);
		}
	}

	int size() {
		return buckets.size();
	}

	private void refill(Bucket bucket, long now) {
		double elapsedSeconds = (now - bucket.lastRefillNanos) / 1_000_000_000.0d;
		if (elapsedSeconds > 0) {
			bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsedSeconds * bucket.refillPerSecond);
			bucket.lastRefillNanos = now;
		}
	}

	private void maybeCleanup() {
		if ((ops.incrementAndGet() & 63L) != 0L) {
			return;
		}
		long now = clock.getAsLong();
		buckets.entrySet().removeIf(entry -> {
			Bucket bucket = entry.getValue();
			synchronized (bucket) {
				return bucket.tokens >= bucket.capacity - 1e-9
						&& now - bucket.lastRefillNanos > IDLE_EVICT_NANOS;
			}
		});
	}
}
