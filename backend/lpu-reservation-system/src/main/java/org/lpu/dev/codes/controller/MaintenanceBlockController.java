package org.lpu.dev.codes.controller;

import org.lpu.dev.codes.model.apiresponse.MaintenanceBlockResponse;
import org.lpu.dev.codes.services.MaintenanceBlockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public endpoints — no auth required, read-only.
 * Used by customer calendars to show maintenance blocks.
 */
@RestController
@RequestMapping("/api/public/maintenance")
@CrossOrigin(origins = "*")
public class MaintenanceBlockController {

    @Autowired
    private MaintenanceBlockService svc;

    @GetMapping
    public ResponseEntity<MaintenanceBlockResponse> getBlocks(@RequestParam String facility) {
        MaintenanceBlockResponse res = new MaintenanceBlockResponse();
        try {
            res.setSuccess(true);
            res.setBlocks(svc.getByFacility(facility));
        } catch (Exception e) {
            res.setSuccess(false);
            res.setMessage("Failed to fetch maintenance blocks: " + e.getMessage());
        }
        return ResponseEntity.ok(res);
    }
}
