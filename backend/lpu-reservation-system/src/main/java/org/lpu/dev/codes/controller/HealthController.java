package org.lpu.dev.codes.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@CrossOrigin("*")
public class HealthController {

	@GetMapping({ "", "/", "/health" })
	public ResponseEntity<Map<String, String>> health() {
		return ResponseEntity.ok(Map.of("status", "ok"));
	}
}
