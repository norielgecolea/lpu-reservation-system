package org.lpu.dev.codes.services;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.FltReservation;
import org.lpu.dev.codes.model.data.GymnasiumReservation;
import org.lpu.dev.codes.model.data.NexusReservation;
import org.lpu.dev.codes.model.data.ReservationReminder;
import org.lpu.dev.codes.model.data.VanReservation;
import org.lpu.dev.codes.repository.FltReservationRepository;
import org.lpu.dev.codes.repository.GymnasiumReservationRepository;
import org.lpu.dev.codes.repository.NexusReservationRepository;
import org.lpu.dev.codes.repository.ReservationReminderRepository;
import org.lpu.dev.codes.repository.VanReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sends cancel-or-be-penalized reminder emails to requestors of APPROVED
 * reservations at 1 week, 3 days, and 1 day before each reserved date.
 */
@Service
public class ReservationReminderService {

    private static final Logger logger = LogManager.getLogger(ReservationReminderService.class);
    private static final ZoneId MANILA = ZoneId.of("Asia/Manila");
    private static final int[] REMINDER_OFFSETS = { 7, 3, 1 };

    private static final String SERVICE_FLT = "FLT";
    private static final String SERVICE_GYM = "GYMNASIUM";
    private static final String SERVICE_VAN = "VAN";
    private static final String SERVICE_NEXUS = "NEXUS";

    @Autowired private FltReservationRepository fltReservationRepository;
    @Autowired private GymnasiumReservationRepository gymnasiumReservationRepository;
    @Autowired private NexusReservationRepository nexusReservationRepository;
    @Autowired private VanReservationRepository vanReservationRepository;
    @Autowired private ReservationReminderRepository reminderRepository;

    @Autowired private FltEmailService fltEmailService;
    @Autowired private GymnasiumEmailService gymnasiumEmailService;
    @Autowired private NexusEmailService nexusEmailService;
    @Autowired private VanEmailService vanEmailService;

    /** Runs every day at 8:00 AM Asia/Manila. */
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Manila")
    @Transactional
    public void sendUpcomingReservationReminders() {
        LocalDate today = LocalDate.now(MANILA);
        logger.info("Running reservation reminder job for {}", today);

        int sent = 0;
        for (int daysBefore : REMINDER_OFFSETS) {
            String targetDate = today.plusDays(daysBefore).toString();
            String reminderType = reminderTypeFor(daysBefore);
            sent += processFlt(targetDate, daysBefore, reminderType);
            sent += processGymnasium(targetDate, daysBefore, reminderType);
            sent += processNexus(targetDate, daysBefore, reminderType);
            sent += processVan(targetDate, daysBefore, reminderType);
        }

        logger.info("Reservation reminder job finished — {} email(s) sent", sent);
    }

    private int processFlt(String targetDate, int daysBefore, String reminderType) {
        List<FltReservation> reservations = fltReservationRepository.findApprovedByReservedDate(targetDate);
        int sent = 0;
        for (FltReservation r : reservations) {
            if (alreadySent(SERVICE_FLT, r.getId(), targetDate, reminderType)) {
                continue;
            }
            if (fltEmailService.sendReminderEmail(r, daysBefore)) {
                recordSent(SERVICE_FLT, r.getId(), targetDate, reminderType);
                sent++;
            }
        }
        return sent;
    }

    private int processGymnasium(String targetDate, int daysBefore, String reminderType) {
        List<GymnasiumReservation> reservations =
                gymnasiumReservationRepository.findApprovedByReservedDate(targetDate);
        int sent = 0;
        for (GymnasiumReservation r : reservations) {
            if (alreadySent(SERVICE_GYM, r.getId(), targetDate, reminderType)) {
                continue;
            }
            if (gymnasiumEmailService.sendReminderEmail(r, daysBefore)) {
                recordSent(SERVICE_GYM, r.getId(), targetDate, reminderType);
                sent++;
            }
        }
        return sent;
    }

    private int processNexus(String targetDate, int daysBefore, String reminderType) {
        List<NexusReservation> reservations =
                nexusReservationRepository.findApprovedByReservedDate(targetDate);
        int sent = 0;
        for (NexusReservation r : reservations) {
            if (alreadySent(SERVICE_NEXUS, r.getId(), targetDate, reminderType)) {
                continue;
            }
            if (nexusEmailService.sendReminderEmail(r, daysBefore)) {
                recordSent(SERVICE_NEXUS, r.getId(), targetDate, reminderType);
                sent++;
            }
        }
        return sent;
    }

    private int processVan(String targetDate, int daysBefore, String reminderType) {
        List<VanReservation> reservations = vanReservationRepository.findApprovedByReservedDate(targetDate);
        int sent = 0;
        for (VanReservation r : reservations) {
            if (alreadySent(SERVICE_VAN, r.getId(), targetDate, reminderType)) {
                continue;
            }
            if (vanEmailService.sendReminderEmail(r, daysBefore)) {
                recordSent(SERVICE_VAN, r.getId(), targetDate, reminderType);
                sent++;
            }
        }
        return sent;
    }

    private boolean alreadySent(String service, Long reservationId, String reservedDate, String reminderType) {
        return reminderRepository.exists(service, reservationId, reservedDate, reminderType);
    }

    private void recordSent(String service, Long reservationId, String reservedDate, String reminderType) {
        ReservationReminder reminder = new ReservationReminder();
        reminder.setService(service);
        reminder.setReservationId(reservationId);
        reminder.setReservedDate(reservedDate);
        reminder.setReminderType(reminderType);
        reminderRepository.save(reminder);
    }

    private static String reminderTypeFor(int daysBefore) {
        return switch (daysBefore) {
            case 7 -> "7_DAY";
            case 3 -> "3_DAY";
            case 1 -> "1_DAY";
            default -> daysBefore + "_DAY";
        };
    }
}
