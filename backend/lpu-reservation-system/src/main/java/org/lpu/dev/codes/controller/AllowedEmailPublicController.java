package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EmailCheckResponse;
import org.lpu.dev.codes.services.AllowedReservationEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/allowed-emails")
@CrossOrigin("*")
public class AllowedEmailPublicController {

    private static final Logger logger = LogManager.getLogger(AllowedEmailPublicController.class);

    @Autowired
    private AllowedReservationEmailService emailService;

    @GetMapping("/check")
    public EmailCheckResponse checkEmail(@RequestParam("email") String email) {
        EmailCheckResponse response = new EmailCheckResponse();
        try {
            String validationError = emailService.validateRestrictedServiceEmail(email);
            response.setSuccess(true);
            response.setAllowed(validationError == null);
            response.setMessage(validationError != null
                    ? validationError
                    : "Email is authorized for reservation.");
        } catch (Exception e) {
            logger.error("Error checking allowed email", e);
            response.setSuccess(false);
            response.setAllowed(false);
            response.setMessage("Failed to verify email");
        }
        return response;
    }
}
