package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.VanReservationResponse;
import org.lpu.dev.codes.model.dto.VanApprovedEventDto;
import org.lpu.dev.codes.model.dto.VanReservationRequest;
import org.lpu.dev.codes.services.VanReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/van")
@CrossOrigin("*")
public class VanReservationController {

    private static final Logger logger = LogManager.getLogger(VanReservationController.class);

    @Autowired private VanReservationService vanService;

    @GetMapping("/approved-events")
    public VanReservationResponse getApprovedEvents() {
        VanReservationResponse res = new VanReservationResponse();
        try {
            List<VanApprovedEventDto> events = vanService.getApprovedEvents();
            res.setSuccess(true);
            res.setMessage("Approved events fetched successfully");
            res.setApprovedEvents(events);
        } catch (Exception e) {
            logger.error("Error fetching van approved events", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch approved events");
        }
        return res;
    }

    @GetMapping("/vehicles")
    public VanReservationResponse getVehicles() {
        VanReservationResponse res = new VanReservationResponse();
        try {
            res.setSuccess(true);
            res.setMessage("Vehicles fetched successfully");
            res.setVehicles(vanService.getAvailableVehicles());
        } catch (Exception e) {
            logger.error("Error fetching van vehicles", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch vehicles");
        }
        return res;
    }

    @PostMapping("/reserve")
    public EquipmentResponse submitReservation(@RequestBody VanReservationRequest request) {
        EquipmentResponse res = new EquipmentResponse();
        try {
            boolean created = vanService.createReservation(request);
            res.setSuccess(created);
            res.setMessage(created ? "Reservation submitted successfully" : "Failed to submit reservation");
        } catch (Exception e) {
            logger.error("Error submitting van reservation", e);
            res.setSuccess(false);
            res.setMessage("Failed to submit reservation");
        }
        return res;
    }
}
