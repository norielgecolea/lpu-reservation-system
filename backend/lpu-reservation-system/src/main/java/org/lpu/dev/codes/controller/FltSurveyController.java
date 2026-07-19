package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.services.FltReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public endpoint — no authentication required.
 * Accessed when a user clicks a star rating link in the satisfaction-survey email.
 */
@RestController
@RequestMapping("/api/flt")
@CrossOrigin("*")
public class FltSurveyController {

    private static final Logger logger = LogManager.getLogger(FltSurveyController.class);

    @Autowired
    private FltReservationService fltReservationService;

    @GetMapping(value = "/survey", produces = MediaType.TEXT_HTML_VALUE)
    public String submitSurvey(
            @RequestParam Long id,
            @RequestParam int rating) {

        if (rating < 1 || rating > 5) {
            return errorPage("Invalid rating value. Please use a value between 1 and 5.");
        }

        boolean saved = fltReservationService.saveRating(id, rating);
        if (!saved) {
            return errorPage("We could not find your reservation. It may have already been rated.");
        }

        logger.info("Satisfaction rating {} saved for FLT reservation {}", rating, id);
        return thankyouPage(rating);
    }

    // ─── HTML pages ──────────────────────────────────────────────────────────

    private static String thankyouPage(int rating) {
        String[] stars = buildStars(rating);
        String[] messages = {
            "We're sorry to hear that. Your feedback will help us improve.",
            "Thank you for your honest feedback. We'll work on doing better.",
            "Thank you! We'll strive to provide a better experience next time.",
            "Great to hear! We're glad the event went well.",
            "Wonderful! We're thrilled you had an excellent experience! 🎉"
        };
        String[] colors = {"#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"};
        String accentColor = colors[Math.min(rating - 1, 4)];
        String message = messages[Math.min(rating - 1, 4)];

        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<title>Thank You — LPU Laguna FLT</title>"
            + "<style>"
            + "body{margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}"
            + ".card{background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.1);padding:48px 40px;max-width:480px;width:100%;text-align:center;}"
            + ".badge{display:inline-flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:50%;font-size:36px;margin-bottom:20px;}"
            + ".stars{font-size:32px;margin:16px 0;letter-spacing:4px;}"
            + "h1{font-size:26px;font-weight:900;color:#111827;margin:0 0 8px;}"
            + "p{font-size:15px;color:#4b5563;margin:0 0 28px;line-height:1.6;}"
            + ".footer{font-size:12px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:20px;}"
            + "</style></head><body>"
            + "<div class='card'>"
            + "<div class='badge' style='background:" + accentColor + "20;'>"
            + "<span style='color:" + accentColor + ";'>" + (rating == 5 ? "🌟" : rating == 4 ? "😊" : rating == 3 ? "😐" : rating == 2 ? "😕" : "😞") + "</span>"
            + "</div>"
            + "<h1>Thank you for your feedback!</h1>"
            + "<div class='stars'>" + stars[0] + "</div>"
            + "<p>" + message + "</p>"
            + "<p style='font-size:14px;color:#6b7280;'>You rated your experience <strong style='color:" + accentColor + ";'>" + rating + " out of 5</strong>.</p>"
            + "<div class='footer'>"
            + "<p style='margin:0;'>LPU Laguna — FLT Facility Reservation System</p>"
            + "<p style='margin:4px 0 0;'>Lyceum of the Philippines University Laguna Campus</p>"
            + "</div>"
            + "</div></body></html>";
    }

    private static String errorPage(String message) {
        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<title>Error — LPU Laguna FLT</title>"
            + "<style>body{margin:0;background:#f3f4f6;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}"
            + ".card{background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.1);padding:48px 40px;max-width:420px;text-align:center;}"
            + "h1{font-size:22px;color:#ef4444;margin:0 0 12px;} p{color:#4b5563;font-size:15px;}</style></head><body>"
            + "<div class='card'><div style='font-size:48px;margin-bottom:16px;'>⚠️</div>"
            + "<h1>Something went wrong</h1><p>" + message + "</p></div></body></html>";
    }

    private static String[] buildStars(int rating) {
        StringBuilder filled = new StringBuilder();
        StringBuilder empty = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            filled.append(i <= rating ? "★" : "☆");
        }
        return new String[]{filled.toString()};
    }
}
