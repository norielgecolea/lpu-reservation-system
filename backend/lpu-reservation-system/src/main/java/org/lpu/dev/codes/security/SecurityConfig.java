package org.lpu.dev.codes.security;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Autowired
	private JWTAuthenticationFilter jwtFilter;

	@Autowired
	private RateLimitFilter rateLimitFilter;

	public SecurityConfig(JWTAuthenticationFilter jwtFilter, RateLimitFilter rateLimitFilter) {
		this.jwtFilter = jwtFilter;
		this.rateLimitFilter = rateLimitFilter;
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.csrf(csrf -> csrf.disable())
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/api", "/api/", "/api/health").permitAll()
						.requestMatchers("/api/auth/**").permitAll()
						.requestMatchers("/api/public/**").permitAll()
						.requestMatchers("/api/flt/survey", "/api/gymnasium/survey", "/api/nexus/survey").permitAll()
						.requestMatchers("/ws", "/ws/**", "/ws-sockjs", "/ws-sockjs/**").permitAll()
						.requestMatchers("/uploads/**").permitAll()
						.anyRequest().authenticated())
				.exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
					response.setStatus(401);
					response.setCharacterEncoding(StandardCharsets.UTF_8.name());
					response.setContentType(MediaType.APPLICATION_JSON_VALUE);
					response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized\"}");
				}))
				.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterAfter(rateLimitFilter, JWTAuthenticationFilter.class);

		return http.build();
	}
}
