package org.lpu.dev.codes.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JWTAuthenticationFilter extends OncePerRequestFilter {

	private static final Logger LOGGER = LogManager.getLogger(JWTAuthenticationFilter.class);

    @Autowired
    private JWTService jwtService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = servletPath(request);
        return path.equals("/api")
                || path.equals("/api/")
                || path.equals("/api/health")
                || path.startsWith("/api/auth/")
                || path.startsWith("/api/flt/survey")
                || path.startsWith("/api/gymnasium/survey")
                || path.startsWith("/api/nexus/survey")
                || path.startsWith("/ws")
                || path.startsWith("/uploads");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {
        String path = servletPath(request);
        String authHeader = request.getHeader("Authorization");
        boolean publicBooking = path.startsWith("/api/public/");

        if (authHeader == null || authHeader.isBlank()) {
            if (publicBooking) {
                filterChain.doFilter(request, response);
                return;
            }
            reject(response);
            return;
        }

        if (!authHeader.startsWith("LpuL ")) {
            reject(response);
            return;
        }

        Users user = jwtService.authenticate(authHeader);
        if (user == null) {
            reject(response);
            return;
        }

        var authentication = new UsernamePasswordAuthenticationToken(
                user.getUsername(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private static void reject(HttpServletResponse response) throws IOException {
        LOGGER.warn("Rejected unauthenticated request");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
    }

    static String servletPath(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path != null && !path.isEmpty()) {
            return path;
        }
        String uri = request.getRequestURI();
        if (uri == null) {
            return "";
        }
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            return uri.substring(context.length());
        }
        return uri;
    }
}
