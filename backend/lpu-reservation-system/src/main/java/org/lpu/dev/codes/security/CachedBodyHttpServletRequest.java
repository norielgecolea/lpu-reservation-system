package org.lpu.dev.codes.security;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

final class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

	private final byte[] cachedBody;

	CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
		super(request);
		cachedBody = request.getInputStream().readAllBytes();
	}

	byte[] getCachedBody() {
		return cachedBody;
	}

	@Override
	public ServletInputStream getInputStream() {
		ByteArrayInputStream input = new ByteArrayInputStream(cachedBody);
		return new ServletInputStream() {
			@Override
			public int read() {
				return input.read();
			}

			@Override
			public boolean isFinished() {
				return input.available() == 0;
			}

			@Override
			public boolean isReady() {
				return true;
			}

			@Override
			public void setReadListener(ReadListener listener) {
				// Unused: body is already fully buffered.
			}
		};
	}

	@Override
	public BufferedReader getReader() {
		return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
	}
}
