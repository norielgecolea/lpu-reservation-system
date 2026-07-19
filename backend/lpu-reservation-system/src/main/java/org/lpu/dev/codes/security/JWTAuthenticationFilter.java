package org.lpu.dev.codes.security;

import java.io.IOException;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    private JWTUtil jwtUtil;

    @Autowired
    private UserRepository usersRepository;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/flt/survey")
                || path.startsWith("/ws");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {
    	String path = request.getServletPath();

    	if (path.startsWith("/api/auth/") || path.startsWith("/api/flt/survey")) {
    	    filterChain.doFilter(request, response);
    	    return;
    	}
        String uri = request.getRequestURI();
        String authHeader = request.getHeader("Authorization");

        LOGGER.info("Incoming request: " + uri);
        
        

        if (authHeader == null) {
            LOGGER.warn("Missing Authorization header");
            filterChain.doFilter(request, response);
            return;
        }

        LOGGER.info("Authorization header found");

        if (!authHeader.startsWith("LpuL ")) {
            LOGGER.warn("Invalid token prefix");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String username = jwtUtil.getUsername(authHeader.replace("LpuL ", ""));

        if (username == null) {
            LOGGER.error("Token parsing failed - username is null");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        LOGGER.info("Token belongs to user: " + username);

        Users user = usersRepository.findByUsername(username);

        if (user == null) {
            LOGGER.error("User not found in database: " + username);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        LOGGER.info("User status: " + user.getStatus());

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            LOGGER.warn("User is inactive: " + username);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        LOGGER.info("Authentication successful for: " + username);

        filterChain.doFilter(request, response);
    }
}