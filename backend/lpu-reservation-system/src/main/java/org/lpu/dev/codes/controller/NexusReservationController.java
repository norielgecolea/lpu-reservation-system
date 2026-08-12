package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.NexusReservationResponse;
import org.lpu.dev.codes.model.dto.NexusApprovedEventDto;
import org.lpu.dev.codes.model.dto.NexusReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.services.NexusReservationService;
import org.lpu.dev.codes.services.ReservationOtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/nexus")
@CrossOrigin("*")
public class NexusReservationController {

    private static final Logger logger = LogManager.getLogger(NexusReservationController.class);

    @Autowired
    private NexusReservationService gymService;

    @Autowired
    private ReservationOtpService reservationOtpService;

    @GetMapping("/equipment")
    public NexusReservationResponse getEquipment() {
        NexusReservationResponse res = new NexusReservationResponse();
        try {
            List<PopulateEquipmentList> equipment = gymService.getGymEquipment();
            res.setSuccess(true);
            res.setMessage("Equipment fetched successfully");
            res.setEquipment(equipment);
        } catch (Exception e) {
            logger.error("Error fetching nexus equipment", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch equipment");
        }
        return res;
    }

    @GetMapping("/approved-events")
    public NexusReservationResponse getApprovedEvents() {
        NexusReservationResponse res = new NexusReservationResponse();
        try {
            List<NexusApprovedEventDto> events = gymService.getApprovedEvents();
            res.setSuccess(true);
            res.setMessage("Approved events fetched successfully");
            res.setApprovedEvents(events);
        } catch (Exception e) {
            logger.error("Error fetching nexus approved events", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch approved events");
        }
        return res;
    }

    @PostMapping("/reserve")
    public EquipmentResponse submitReservation(
            @RequestBody NexusReservationRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        EquipmentResponse res = new EquipmentResponse();
        try {
            if (!reservationOtpService.requireOtpOrStaff(authHeader, request.getOtpToken(), request.getContactEmail())) {
                res.setSuccess(false);
                res.setMessage("Email verification required. Please verify the code sent to your contact email.");
                return res;
            }
            boolean created = gymService.createReservation(request);
            res.setSuccess(created);
            res.setMessage(created ? "Reservation submitted successfully" : "Failed to submit reservation");
        } catch (Exception e) {
            logger.error("Error submitting nexus reservation", e);
            res.setSuccess(false);
            res.setMessage("Failed to submit reservation");
        }
        return res;
    }
}
