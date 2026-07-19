package org.lpu.dev.codes.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class IpService {
	@Autowired
	private final HttpServletRequest request;

	public IpService(HttpServletRequest request) {
		this.request = request;
	}

	@Transactional
	public String getClientIp() {
        String[] headers = {
            "X-Forwarded-For",
            "X-Real-IP",
            "CF-Connecting-IP", // Cloudflare
            "True-Client-IP"    // Akamai
        };

        for (String header : headers) {
            String value = request.getHeader(header);

            if (value != null
                    && !value.isBlank()
                    && !"unknown".equalsIgnoreCase(value)) {

                // X-Forwarded-For can contain multiple IPs
                return value.split(",")[0].trim();
            }
        }

        return request.getRemoteAddr();
    }


	@Transactional
	public String getClientAgent() {
		String userAgent = request.getHeader("User-Agent");
		return userAgent;
	}
}
