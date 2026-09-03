package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.model.data.EoReservation;
import org.lpu.dev.codes.model.dto.EoReservationAdminDto;
import org.lpu.dev.codes.model.dto.EoReservationRequest;
import org.lpu.dev.codes.model.dto.EoReservedDateSlot;
import org.lpu.dev.codes.repository.EoReservationRepository;
import org.lpu.dev.codes.util.AppDateTimes;
import org.lpu.dev.codes.util.ReservationSlot;
import org.lpu.dev.codes.util.ReservationSlotUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EoReservationService {

    private static final Logger logger = LogManager.getLogger(EoReservationService.class);
    private static final Set<String> VALID_ROOMS = Set.of("BOARDROOM", "CONFERENCE");

    @Autowired private EoReservationRepository eoRepository;
    @Autowired private EoEmailService eoEmailService;
    @Autowired private ReservationEventPublisher eventPublisher;
    @Autowired private AdminAuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<EoReservationAdminDto> listEvents(String month, String roomType) {
        String room = normalizeRoom(roomType);
        List<Object[]> rows = eoRepository.findAllNative(month, room);
        List<EoReservationAdminDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(mapRow(row));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public EoReservationAdminDto getById(Long id) {
        return eoRepository.findById(id).map(this::toDto).orElse(null);
    }

    @Transactional
    public ReservationActionResponse create(EoReservationRequest req, String performedBy) {
        ReservationActionResponse res = new ReservationActionResponse();
        String room = normalizeRoom(req.getRoomType());
        if (room == null) {
            res.setSuccess(false);
            res.setMessage("Room type must be BOARDROOM or CONFERENCE");
            return res;
        }
        if (blank(req.getAgenda()) || blank(req.getDepartment()) || blank(req.getOrganization())) {
            res.setSuccess(false);
            res.setMessage("Agenda, department, and organization are required");
            return res;
        }
        if (req.getReservedDates() == null || req.getReservedDates().isEmpty()) {
            res.setSuccess(false);
            res.setMessage("Select at least one date and time");
            return res;
        }
        for (EoReservedDateSlot slot : req.getReservedDates()) {
            if (slot == null || blank(slot.getDate()) || blank(slot.getStartTime()) || blank(slot.getEndTime())) {
                res.setSuccess(false);
                res.setMessage("Each selected date needs a start and end time");
                return res;
            }
        }

        boolean skipContact = req.isSkipContact();
        String contactPerson = trimToNull(req.getContactPerson());
        String contactEmail = trimToNull(req.getContactEmail());
        String contactNumber = trimToNull(req.getContactNumber());
        if (skipContact) {
            contactPerson = null;
            contactEmail = null;
            contactNumber = null;
        } else if (contactPerson == null || contactEmail == null || contactNumber == null) {
            res.setSuccess(false);
            res.setMessage("Contact person, email, and number are required unless skipped");
            return res;
        }

        try {
            String datesJson = objectMapper.writeValueAsString(req.getReservedDates());
            List<ReservationSlot> incoming = ReservationSlotUtil.parseReservedDates(datesJson, objectMapper);
            if (hasOverlap(room, incoming, null)) {
                res.setSuccess(false);
                res.setMessage("Selected time overlaps an existing booking for this room");
                res.setBlockedReason("overlap");
                return res;
            }

            EoReservation r = new EoReservation();
            r.setRoomType(room);
            r.setAgenda(req.getAgenda().trim());
            r.setDepartment(req.getDepartment().trim());
            r.setOrganization(req.getOrganization().trim());
            r.setNotes(trimToNull(req.getNotes()));
            r.setContactPerson(contactPerson);
            r.setContactEmail(contactEmail == null ? null : contactEmail.toLowerCase(Locale.ROOT));
            r.setContactNumber(contactNumber);
            r.setReservedDates(datesJson);
            r.setStatus("APPROVED");
            r.setCreatedBy(performedBy);
            r.setApprovedBy(performedBy);
            r.setApprovedAt(AppDateTimes.nowUtc());
            eoRepository.save(r);

            eoEmailService.sendConfirmation(r);
            eventPublisher.publishCreated("eo", r.getId());
            eventPublisher.publishStatusUpdate("eo", r.getId(), "APPROVED", List.of());
            auditService.log("EO", "CREATE", performedBy, "RESERVATION", r.getId(), r.getAgenda(),
                    Map.of("roomType", room, "skipContact", skipContact));

            res.setSuccess(true);
            res.setMessage("Reservation saved");
            logger.info("EO reservation created id={} room={} by={}", r.getId(), room, performedBy);
            return res;
        } catch (Exception e) {
            logger.error("Failed to create EO reservation", e);
            res.setSuccess(false);
            res.setMessage("Failed to save reservation");
            return res;
        }
    }

    @Transactional
    public ReservationActionResponse cancel(Long id, String performedBy) {
        ReservationActionResponse res = new ReservationActionResponse();
        EoReservation existing = eoRepository.findById(id).orElse(null);
        if (existing == null) {
            res.setSuccess(false);
            res.setMessage("Reservation not found");
            return res;
        }
        if (!"APPROVED".equalsIgnoreCase(existing.getStatus())) {
            res.setSuccess(false);
            res.setMessage("Only approved reservations can be cancelled");
            return res;
        }
        eoRepository.updateStatus(id, "CANCELLED");
        existing.setStatus("CANCELLED");
        eoEmailService.sendCancellation(existing);
        eventPublisher.publishStatusUpdate("eo", id, "CANCELLED", List.of());
        auditService.log("EO", "CANCEL", performedBy, "RESERVATION", id, existing.getAgenda(),
                Map.of("roomType", existing.getRoomType()));
        res.setSuccess(true);
        res.setMessage("Reservation cancelled");
        return res;
    }

    private boolean hasOverlap(String roomType, List<ReservationSlot> incoming, Long excludeId) {
        for (EoReservation other : eoRepository.findApprovedByRoom(roomType)) {
            if (excludeId != null && excludeId.equals(other.getId())) continue;
            List<ReservationSlot> otherSlots =
                    ReservationSlotUtil.parseReservedDates(other.getReservedDates(), objectMapper);
            if (ReservationSlotUtil.anyOverlap(incoming, otherSlots)) {
                return true;
            }
        }
        return false;
    }

    private EoReservationAdminDto mapRow(Object[] row) {
        EoReservationAdminDto dto = new EoReservationAdminDto();
        dto.setId(row[0] != null ? ((Number) row[0]).longValue() : null);
        dto.setRoomType((String) row[1]);
        dto.setAgenda((String) row[2]);
        dto.setDepartment((String) row[3]);
        dto.setOrganization((String) row[4]);
        dto.setNotes((String) row[5]);
        dto.setContactPerson((String) row[6]);
        dto.setContactEmail((String) row[7]);
        dto.setContactNumber((String) row[8]);
        dto.setReservedDates((String) row[9]);
        dto.setStatus((String) row[10]);
        dto.setCreatedBy((String) row[11]);
        dto.setCreatedAt(AppDateTimes.toApiUtc(row[12]));
        dto.setApprovedAt(AppDateTimes.toApiUtc(row[13]));
        dto.setApprovedBy((String) row[14]);
        return dto;
    }

    private EoReservationAdminDto toDto(EoReservation r) {
        EoReservationAdminDto dto = new EoReservationAdminDto();
        dto.setId(r.getId());
        dto.setRoomType(r.getRoomType());
        dto.setAgenda(r.getAgenda());
        dto.setDepartment(r.getDepartment());
        dto.setOrganization(r.getOrganization());
        dto.setNotes(r.getNotes());
        dto.setContactPerson(r.getContactPerson());
        dto.setContactEmail(r.getContactEmail());
        dto.setContactNumber(r.getContactNumber());
        dto.setReservedDates(r.getReservedDates());
        dto.setStatus(r.getStatus());
        dto.setCreatedBy(r.getCreatedBy());
        dto.setCreatedAt(AppDateTimes.toApiUtc(r.getCreatedAt()));
        dto.setApprovedAt(AppDateTimes.toApiUtc(r.getApprovedAt()));
        dto.setApprovedBy(r.getApprovedBy());
        return dto;
    }

    public static String normalizeRoom(String roomType) {
        if (roomType == null || roomType.isBlank()) return null;
        String n = roomType.trim().toUpperCase(Locale.ROOT);
        return VALID_ROOMS.contains(n) ? n : null;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
