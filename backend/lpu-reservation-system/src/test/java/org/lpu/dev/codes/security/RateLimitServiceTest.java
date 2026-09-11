package org.lpu.dev.codes.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RateLimitServiceTest {

	private final AtomicLong now = new AtomicLong(1_000_000_000L);
	private RateLimitService limiter;

	@BeforeEach
	void setUp() {
		limiter = new RateLimitService(now::get);
	}

	@Test
	void allowsUpToCapacityThenRejects() {
		for (int i = 0; i < 3; i++) {
			assertTrue(limiter.tryConsume("a", 3, 1).allowed());
		}
		RateLimitService.Result denied = limiter.tryConsume("a", 3, 1);
		assertFalse(denied.allowed());
		assertTrue(denied.retryAfterSeconds() >= 1);
	}

	@Test
	void isolatesKeys() {
		assertTrue(limiter.tryConsume("one", 1, 1).allowed());
		assertFalse(limiter.tryConsume("one", 1, 1).allowed());
		assertTrue(limiter.tryConsume("two", 1, 1).allowed());
	}

	@Test
	void refillsAfterElapsedTime() {
		assertTrue(limiter.tryConsume("k", 1, 10).allowed());
		assertFalse(limiter.tryConsume("k", 1, 10).allowed());
		now.addAndGet(200_000_000L); // 0.2s * 10 tokens/s = 2 tokens
		assertTrue(limiter.tryConsume("k", 1, 10).allowed());
	}

	@Test
	void hashedKeysDifferByPrefixAndValue() {
		assertNotEquals(limiter.hashed("email:", "a@b.c"), limiter.hashed("otp:", "a@b.c"));
		assertNotEquals(limiter.hashed("email:", "a@b.c"), limiter.hashed("email:", "x@y.z"));
		assertEquals(64 + "email:".length(), limiter.hashed("email:", "a@b.c").length());
	}
}
