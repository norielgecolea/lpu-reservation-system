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

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
                    return message;
                }
                String authHeader = accessor.getFirstNativeHeader("Authorization");
                if (authHeader == null || !authHeader.startsWith("LpuL ")) {
                    throw new MessageDeliveryException("Missing or invalid Authorization header");
                }
                String token = authHeader.substring(5);
                if (!jwtService.validateToken(token)) {
                    throw new MessageDeliveryException("Invalid or expired token");
                }
                String role = jwtService.getRole(token);
                if (!"SUPERADMIN".equals(role) && !"FACILITIESADMIN".equals(role)) {
                    throw new MessageDeliveryException("Access denied");
                }
                String username = jwtService.getUsername(token);
                if (username == null || !authService.userActive(username)) {
                    throw new MessageDeliveryException("User not active");
                }
                logger.info("WebSocket CONNECT authorized for {}", username);
                return message;
            }
        });
    }
}
