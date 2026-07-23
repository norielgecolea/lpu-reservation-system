package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.ReservationOtpResponse;
import org.lpu.dev.codes.model.dto.ReservationOtpSendRequest;
import org.lpu.dev.codes.model.dto.ReservationOtpVerifyRequest;
import org.lpu.dev.codes.services.ReservationOtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/reservation-otp")
@CrossOrigin("*")
public class ReservationOtpController {

    private static final Logger logger = LogManager.getLogger(ReservationOtpController.class);

    @Autowired
    private ReservationOtpService otpService;

    @PostMapping("/send")
    public ReservationOtpResponse send(@RequestBody ReservationOtpSendRequest request) {
        ReservationOtpResponse res = new ReservationOtpResponse();
        try {
            otpService.sendCode(request.getEmail(), request.getContactPerson());
            res.setSuccess(true);
            res.setMessage("Verification code sent to your email");
        } catch (IllegalArgumentException | IllegalStateException e) {
            res.setSuccess(false);
            res.setMessage(e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to send reservation OTP", e);
            res.setSuccess(false);
            res.setMessage("Failed to send verification code");
        }
        return res;
    }

    @PostMapping("/verify")
    public ReservationOtpResponse verify(@RequestBody ReservationOtpVerifyRequest request) {
        ReservationOtpResponse res = new ReservationOtpResponse();
        try {
            String token = otpService.verifyCode(request.getEmail(), request.getCode());
            res.setSuccess(true);
            res.setMessage("Email verified");
            res.setOtpToken(token);
        } catch (IllegalArgumentException e) {
            res.setSuccess(false);
            res.setMessage(e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to verify reservation OTP", e);
            res.setSuccess(false);
            res.setMessage("Failed to verify code");
        }
        return res;
    }
}
