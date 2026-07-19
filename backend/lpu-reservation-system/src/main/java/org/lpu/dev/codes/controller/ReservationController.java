package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.FltReservationResponse;
import org.lpu.dev.codes.model.dto.FltApprovedEventDto;
import org.lpu.dev.codes.model.dto.FltReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.services.FltReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/flt")
@CrossOrigin("*")
public class ReservationController {

    private static final Logger logger = LogManager.getLogger(ReservationController.class);

    @Autowired
    private FltReservationService fltReservationService;

    @GetMapping("/equipment")
    public FltReservationResponse getFltEquipment() {
        FltReservationResponse res = new FltReservationResponse();
        try {
            List<PopulateEquipmentList> equipment = fltReservationService.getFltEquipment();
            res.setSuccess(true);
            res.setMessage("Equipment fetched successfully");
            res.setEquipment(equipment);
        } catch (Exception e) {
            logger.error("Error fetching FLT equipment", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch equipment");
        }
        return res;
    }

    @GetMapping("/occupied-dates")
    public FltReservationResponse getOccupiedDates() {
        FltReservationResponse res = new FltReservationResponse();
        try {
            List<String> dates = fltReservationService.getOccupiedDates();
            res.setSuccess(true);
            res.setMessage("Occupied dates fetched successfully");
            res.setOccupiedDates(dates);
        } catch (Exception e) {
            logger.error("Error fetching FLT occupied dates", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch occupied dates");
        }
        return res;
    }

    @GetMapping("/approved-events")
    public FltReservationResponse getApprovedEvents() {
        FltReservationResponse res = new FltReservationResponse();
        try {
            List<FltApprovedEventDto> events = fltReservationService.getApprovedEvents();
            res.setSuccess(true);
            res.setMessage("Approved events fetched successfully");
            res.setApprovedEvents(events);
        } catch (Exception e) {
            logger.error("Error fetching FLT approved events", e);
            res.setSuccess(false);
            res.setMessage("Failed to fetch approved events");
        }
        return res;
    }

    @PostMapping("/reserve")
    public EquipmentResponse submitReservation(@RequestBody FltReservationRequest request) {
        EquipmentResponse res = new EquipmentResponse();
        try {
            boolean created = fltReservationService.createReservation(request);
            res.setSuccess(created);
            res.setMessage(created ? "Reservation submitted successfully" : "Failed to submit reservation");
        } catch (Exception e) {
            logger.error("Error submitting FLT reservation", e);
            res.setSuccess(false);
            res.setMessage("Failed to submit reservation");
        }
        return res;
    }
}
