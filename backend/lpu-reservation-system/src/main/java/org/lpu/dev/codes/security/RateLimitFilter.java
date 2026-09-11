package org.lpu.dev.codes.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Per-JWT-session quotas for staff. Public booking is keyed by email (or otpToken)
 * so campus/ISP NAT does not share one bucket; IP is only a high backstop.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	private static final Logger LOGGER = LogManager.getLogger(RateLimitFilter.class);
	private static final int MAX_CACHED_BODY_BYTES = 1_048_576;
	private static final ObjectMapper MAPPER = new ObjectMapper();

	@Autowired
	private JWTUtil jwtUtil;

	@Autowired
	private RateLimitService rateLimitService;

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
			return true;
		}
		String path = request.getServletPath();
		return path.equals("/api")
				|| path.equals("/api/")
				|| path.equals("/api/health")
				|| path.startsWith("/api/flt/survey")
				|| path.startsWith("/ws")
				|| path.startsWith("/uploads");
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain)
			throws ServletException, IOException {
		HttpServletRequest downstream = request;

		String token = bearerToken(request);
		if (token != null && jwtUtil.getUsername(token) != null) {
			RateLimitService.Result result = rateLimitService.tryConsume(
					rateLimitService.hashed("session:", token),
					RateLimitService.SESSION_CAPACITY,
					RateLimitService.SESSION_REFILL_PER_SEC);
			if (!result.allowed()) {
				LOGGER.warn("Rate limited staff session");
				reject(response, result.retryAfterSeconds());
				return;
			}
			filterChain.doFilter(downstream, response);
			return;
		}

		String path = request.getServletPath();
		if (!path.startsWith("/api/public/")) {
			filterChain.doFilter(downstream, response);
			return;
		}

		if (shouldCacheBody(request)) {
			CachedBodyHttpServletRequest cached = new CachedBodyHttpServletRequest(request);
			downstream = cached;
			String identityKey = identityKey(cached);
			if (identityKey != null) {
				RateLimitService.Result identity = rateLimitService.tryConsume(
						identityKey,
						RateLimitService.IDENTITY_CAPACITY,
						RateLimitService.IDENTITY_REFILL_PER_SEC);
				if (!identity.allowed()) {
					LOGGER.warn("Rate limited public identity");
					reject(response, identity.retryAfterSeconds());
					return;
				}
			}
		}

		RateLimitService.Result ipLimit = rateLimitService.tryConsume(
				"ip:" + clientIp(request),
				RateLimitService.IP_CAPACITY,
				RateLimitService.IP_REFILL_PER_SEC);
		if (!ipLimit.allowed()) {
			LOGGER.warn("Rate limited public IP backstop");
			reject(response, ipLimit.retryAfterSeconds());
			return;
		}

		filterChain.doFilter(downstream, response);
	}

	private static String bearerToken(HttpServletRequest request) {
		String header = request.getHeader("Authorization");
		if (header == null || !header.startsWith("LpuL ")) {
			return null;
		}
		String token = header.substring(5).trim();
		return token.isEmpty() ? null : token;
	}

	private static boolean shouldCacheBody(HttpServletRequest request) {
		String method = request.getMethod();
		if (!"POST".equalsIgnoreCase(method) && !"PUT".equalsIgnoreCase(method)) {
			return false;
		}
		String contentType = request.getContentType();
		if (contentType == null || !contentType.toLowerCase().contains(MediaType.APPLICATION_JSON_VALUE)) {
			return false;
		}
		int length = request.getContentLength();
		return length < 0 || length <= MAX_CACHED_BODY_BYTES;
	}

	private String identityKey(CachedBodyHttpServletRequest request) {
		byte[] body = request.getCachedBody();
		if (body == null || body.length == 0 || body.length > MAX_CACHED_BODY_BYTES) {
			return null;
		}
		try {
			JsonNode root = MAPPER.readTree(body);
			if (root == null || !root.isObject()) {
				return null;
			}
			String email = firstText(root, "email", "contactEmail");
			if (!email.isEmpty()) {
				return rateLimitService.hashed("email:", email.trim().toLowerCase());
			}
			String otpToken = text(root, "otpToken");
			if (!otpToken.isEmpty()) {
				return rateLimitService.hashed("otp:", otpToken);
			}
		} catch (Exception ignored) {
			return null;
		}
		return null;
	}

	private static String firstText(JsonNode root, String... fields) {
		for (String field : fields) {
			String value = text(root, field);
			if (!value.isEmpty()) {
				return value;
			}
		}
		return "";
	}

	private static String text(JsonNode root, String field) {
		JsonNode node = root.get(field);
		if (node == null || node.isNull() || !node.isValueNode()) {
			return "";
		}
		String value = node.asText("");
		return value == null ? "" : value.trim();
	}

	private static String clientIp(HttpServletRequest request) {
		String[] headers = {
				"CF-Connecting-IP",
				"True-Client-IP",
				"X-Real-IP",
				"X-Forwarded-For"
		};
		for (String header : headers) {
			String value = request.getHeader(header);
			if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
				return value.split(",")[0].trim();
			}
		}
		String remote = request.getRemoteAddr();
		return remote == null || remote.isBlank() ? "unknown" : remote;
	}

	private static void reject(HttpServletResponse response, int retryAfterSeconds) throws IOException {
		response.setStatus(429);
		response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
		response.setHeader("Access-Control-Allow-Origin", "*");
		response.setHeader("Access-Control-Expose-Headers", "Retry-After");
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter().write("{\"success\":false,\"message\":\"" + RateLimitService.MESSAGE + "\"}");
	}
}
