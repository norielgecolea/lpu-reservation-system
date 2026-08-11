package org.lpu.dev.codes.controller;

import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Driver entity CRUD is retired. Permanent drivers are stored on each vehicle
 * ({@code assigned_driver_name} / {@code assigned_driver_contact}).
 */
@RestController
@RequestMapping("/api/facilities/drivers")
@CrossOrigin("*")
public class DriverManagementController {

    private static final String RETIRED =
            "Drivers management is retired. Assign a permanent driver on each vehicle instead.";

    private EquipmentResponse retired() {
        EquipmentResponse res = new EquipmentResponse();
        res.setSuccess(false);
        res.setMessage(RETIRED);
        return res;
    }

    @GetMapping
    @ResponseStatus(HttpStatus.GONE)
    public EquipmentResponse list(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return retired();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.GONE)
    public EquipmentResponse create(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return retired();
    }

    @PutMapping
    @ResponseStatus(HttpStatus.GONE)
    public EquipmentResponse update(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return retired();
    }

    @PatchMapping("/toggle-status")
    @ResponseStatus(HttpStatus.GONE)
    public EquipmentResponse toggle(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return retired();
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.GONE)
    public EquipmentResponse delete(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        return retired();
    }
}
