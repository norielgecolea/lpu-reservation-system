package org.lpu.dev.codes.config;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger logger = LogManager.getLogger(WebSocketConfig.class);

    @Autowired
    private JWTService jwtService;

    @Autowired
    private AuthenticationService authService;

    @Autowired
    private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket (preferred by the Angular client).
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedWsOrigins());

        // SockJS fallback for older proxies / browsers.
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOriginPatterns(allowedWsOrigins())
                .withSockJS()
                .setSessionCookieNeeded(false);
    }

    private static String[] allowedWsOrigins() {
        return new String[] {
                "https://reservation.lpulaguna.com",
                "https://learnerreservation.lpulaguna.com",
                "http://localhost",
                "http://localhost:*",
                "http://127.0.0.1",
                "http://127.0.0.1:*"
        };
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() == null) {
                    return message;
                }
                StompCommand command = accessor.getCommand();
                if (command == StompCommand.CONNECT) {
                    return authorizeConnect(accessor, message);
                }
                if (command == StompCommand.SEND) {
                    String destination = accessor.getDestination();
                    if (destination != null
                            && (destination.startsWith("/topic") || destination.startsWith("/queue"))) {
                        throw new MessageDeliveryException("Publishing to broker topics is not allowed");
                    }
                }
                return message;
            }

            private Message<?> authorizeConnect(StompHeaderAccessor accessor, Message<?> message) {
                String authHeader = accessor.getFirstNativeHeader("Authorization");
                if (authHeader == null || !authHeader.startsWith("LpuL ")) {
                    logger.warn("WebSocket CONNECT rejected: missing Authorization");
                    throw new MessageDeliveryException("Missing or invalid Authorization header");
                }
                String token = authHeader.substring(5).trim();
                if (!jwtService.validateToken(token)) {
                    logger.warn("WebSocket CONNECT rejected: invalid token");
                    throw new MessageDeliveryException("Invalid or expired token");
                }
                String role = jwtService.getRole(token);
                if (role == null || !roleAccessService.roleHasAnyService(role)) {
                    logger.warn("WebSocket CONNECT rejected: role {}", role);
                    throw new MessageDeliveryException("Access denied");
                }
                String username = jwtService.getUsername(token);
                if (username == null || !authService.userActive(username)) {
                    logger.warn("WebSocket CONNECT rejected: inactive user");
                    throw new MessageDeliveryException("User not active");
                }
                accessor.setLeaveMutable(true);
                accessor.setUser(new UsernamePasswordAuthenticationToken(username, null));
                logger.info("WebSocket CONNECT authorized for {}", username);
                return message;
            }
        });
    }
}
