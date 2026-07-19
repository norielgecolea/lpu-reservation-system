package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.GymnasiumReservationResponse;
import org.lpu.dev.codes.model.dto.GymnasiumApprovedEventDto;
import org.lpu.dev.codes.model.dto.GymnasiumReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.services.GymnasiumReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/gymnasium")
@CrossOrigin("*")
public class GymnasiumReservationController {

    private static final Logger logger = LogManager.getLogger(GymnasiumReservationController.class);

    @Autowired
    private GymnasiumReservationService gymService;

    @GetMapping("/equipment")
    public GymnasiumReservationResponse getEquipment() {
        GymnasiumReservationResponse res = new GymnasiumReservationResponse();
        try {
            List<PopulateEquipmentList> equipment = gymService.getGymEquipment();
            res.setSuccess(true);
            res.setMessage("Equipment fetched successfully");
            res.setEquipment(equipment);
        } catch (Exception e) {
            logger.error("Error fetching gymnasium equipment", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch equipment");
        }
        return res;
    }

    @GetMapping("/approved-events")
    public GymnasiumReservationResponse getApprovedEvents() {
        GymnasiumReservationResponse res = new GymnasiumReservationResponse();
        try {
            List<GymnasiumApprovedEventDto> events = gymService.getApprovedEvents();
            res.setSuccess(true);
            res.setMessage("Approved events fetched successfully");
            res.setApprovedEvents(events);
        } catch (Exception e) {
            logger.error("Error fetching gymnasium approved events", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch approved events");
        }
        return res;
    }

    @PostMapping("/reserve")
    public EquipmentResponse submitReservation(@RequestBody GymnasiumReservationRequest request) {
        EquipmentResponse res = new EquipmentResponse();
        try {
            boolean created = gymService.createReservation(request);
            res.setSuccess(created);
            res.setMessage(created ? "Reservation submitted successfully" : "Failed to submit reservation");
        } catch (Exception e) {
            logger.error("Error submitting gymnasium reservation", e);
            res.setSuccess(false);
            res.setMessage("Failed to submit reservation");
        }
        return res;
    }
}
