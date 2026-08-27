package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.Equipment;
import org.lpu.dev.codes.model.data.FltReservation;
import org.lpu.dev.codes.model.dto.FltApprovedEventDto;
import org.lpu.dev.codes.model.dto.FltReservationAdminDto;
import org.lpu.dev.codes.model.dto.FltReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.repository.EquipmentRepository;
import org.lpu.dev.codes.repository.FltReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.util.AppDateTimes;
import org.lpu.dev.codes.util.ReservationSlot;
import org.lpu.dev.codes.util.ReservationSlotUtil;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class FltReservationService {

    private static final Logger logger = LogManager.getLogger(FltReservationService.class);
    private static final Long FLT_FACILITY_ID = 1L;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private FltReservationRepository fltReservationRepository;

    @Autowired
    private FltEmailService fltEmailService;

    @Autowired
    private ReservationEventPublisher eventPublisher;

    @Autowired
    private AdminAuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<PopulateEquipmentList> getFltEquipment() {
        List<Equipment> allFlt = equipmentRepository.getEquipmentByFacility(FLT_FACILITY_ID);
        List<PopulateEquipmentList> result = new ArrayList<>();
        for (Equipment e : allFlt) {
            if ("AVAILABLE".equalsIgnoreCase(e.getStatus())) {
                PopulateEquipmentList dto = new PopulateEquipmentList();
                dto.setId(e.getId());
                dto.setName(e.getResource_name());
                dto.setStatus(e.getStatus());
                dto.setFacilityId(e.getFacility().getId());
                dto.setFacilityName(e.getFacility().getFacilityName());
                result.add(dto);
            }
        }
        return result;
    }

    public List<String> getOccupiedDates() {
        Set<String> dates = new LinkedHashSet<>();
        try {
            List<String> jsonList = fltReservationRepository.findAllReservedDatesJson();
            for (String json : jsonList) {
                if (json == null) continue;
                JsonNode array = objectMapper.readTree(json);
                if (array.isArray()) {
                    for (JsonNode slot : array) {
                        JsonNode dateNode = slot.get("date");
                        if (dateNode != null && !dateNode.isNull()) {
                            dates.add(dateNode.asText());
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Error reading occupied dates", e);
        }
        return new ArrayList<>(dates);
    }

    public List<FltApprovedEventDto> getApprovedEvents() {
        List<FltApprovedEventDto> result = new ArrayList<>();
        try {
            List<FltReservation> approved = fltReservationRepository.findAllApproved();
            for (FltReservation r : approved) {
                if (r.getReservedDates() == null) continue;
                JsonNode array = objectMapper.readTree(r.getReservedDates());
                if (array.isArray()) {
                    for (JsonNode slot : array) {
                        String date = slot.has("date") ? slot.get("date").asText() : null;
                        String startTime = slot.has("startTime") ? slot.get("startTime").asText() : null;
                        String endTime = slot.has("endTime") ? slot.get("endTime").asText() : null;
                        if (date != null) {
                            result.add(new FltApprovedEventDto(r.getEventTitle(), r.getDepartment(), r.getOrganization(), date, startTime, endTime, "RESERVATION"));
                        }
                    }
                }
                // Include coordination meeting as a blocking event
                if (r.getCoordinationDate() != null && !r.getCoordinationDate().isEmpty()) {
                    result.add(new FltApprovedEventDto(
                        "Coordination Meeting",
                        r.getDepartment(),
                        r.getOrganization(),
                        r.getCoordinationDate(),
                        r.getCoordinationStartTime(),
                        r.getCoordinationEndTime(),
                        "COORDINATION"
                    ));
                }
            }
        } catch (Exception e) {
            logger.error("Error reading approved events", e);
        }
        return result;
    }

    /**
     * Public users cannot book any slot on a day that already has a coordination meeting.
     * Staff booking is allowed to use leftover hours on those days.
     */
    public boolean conflictsWithCoordinationDay(FltReservationRequest req) {
        if (req == null || req.getReservedDates() == null || req.getReservedDates().isEmpty()) {
            return false;
        }
        Set<String> requestedDates = new LinkedHashSet<>();
        for (FltReservationRequest.ReservedDateSlot slot : req.getReservedDates()) {
            if (slot != null && slot.getDate() != null && !slot.getDate().isBlank()) {
                requestedDates.add(slot.getDate());
            }
        }
        if (requestedDates.isEmpty()) return false;
        try {
            List<FltReservation> approved = fltReservationRepository.findAllApproved();
            for (FltReservation r : approved) {
                String coordDate = r.getCoordinationDate();
                if (coordDate != null && !coordDate.isEmpty() && requestedDates.contains(coordDate)) {
                    return true;
                }
            }
        } catch (Exception e) {
            logger.error("Error checking coordination day conflicts", e);
        }
        return false;
    }

    @Transactional(readOnly = true)
    public List<FltReservationAdminDto> getAllReservations(String month) {
        return getAllReservations(month, null, null);
    }

    @Transactional(readOnly = true)
    public List<FltReservationAdminDto> getAllReservations(String month, String fromDate, String toDate) {
        List<Object[]> rows = fltReservationRepository.findAllNative(month, fromDate, toDate);
        List<FltReservationAdminDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            FltReservationAdminDto dto = new FltReservationAdminDto();
            dto.setId(row[0] != null ? ((Number) row[0]).longValue() : null);
            dto.setEventTitle((String) row[1]);
            dto.setEventType((String) row[2]);
            dto.setDepartment((String) row[3]);
            dto.setOrganization((String) row[4]);
            dto.setContactPerson((String) row[5]);
            dto.setContactEmail((String) row[6]);
            dto.setContactNumber((String) row[7]);
            dto.setReservedDates((String) row[8]);
            dto.setRequestedEquipment((String) row[9]);
            dto.setStatus((String) row[10]);
            dto.setCreatedAt(AppDateTimes.toApiUtc(row[11]));
            dto.setRoomType((String) row[12]);
            dto.setExpectedAttendees(row[13] != null ? row[13].toString() : null);
            dto.setCoordinationDate((String) row[14]);
            dto.setCoordinationStartTime((String) row[15]);
            dto.setCoordinationEndTime((String) row[16]);
            dto.setSatisfactionRating(row[17] != null ? ((Number) row[17]).intValue() : null);
            dto.setAdditionalInstructions((String) row[18]);
            dto.setApprovedAt(AppDateTimes.toApiUtc(row[19]));
            dto.setApprovedBy((String) row[20]);
            result.add(dto);
        }
        return result;
    }

    @Transactional
    public ReservationActionResponse updateStatus(Long id, String status, String approvedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        List<String> allowed = java.util.Arrays.asList("APPROVED", "REJECTED", "CANCELLED", "COMPLETED");
        if (!allowed.contains(status)) {
            logger.warn("Attempted to set invalid FLT reservation status: {}", status);
            response.setSuccess(false);
            response.setMessage("Invalid status");
            return response;
        }
        try {
            if ("APPROVED".equals(status)) {
                return approveReservation(id, approvedBy);
            }
            fltReservationRepository.updateStatus(id, status);
            logger.info("FLT reservation {} status updated to {}", id, status);
            var existingOpt = fltReservationRepository.findById(id);
            existingOpt.ifPresent(r -> {
                switch (status) {
                    case "REJECTED"   -> fltEmailService.sendRejectionEmail(r);
                    case "CANCELLED"  -> fltEmailService.sendCancellationEmail(r);
                    case "COMPLETED"  -> fltEmailService.sendSatisfactionSurvey(r);
                }
            });
            List<Long> revertedIds = "CANCELLED".equals(status) ? reEvaluateConflicts() : List.of();
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }
            publishStatusEvent("flt", id, status, List.of(), revertedIds);

            String label = existingOpt.map(FltReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("FLT", status, approvedBy, "reservation", id, label,
                    AdminAuditService.detailsOf("newStatus", status, "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Status updated to " + status);
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to update FLT reservation {} status to {}", id, status, e);
            response.setSuccess(false);
            response.setMessage("Failed to update status");
            return response;
        }
    }

    private ReservationActionResponse approveReservation(Long id, String approvedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        var targetOpt = fltReservationRepository.findById(id);
        if (targetOpt.isEmpty() || !"PENDING".equals(targetOpt.get().getStatus())) {
            response.setSuccess(false);
            response.setMessage("Only pending reservations can be approved");
            return response;
        }
        FltReservation target = targetOpt.get();
        List<ReservationSlot> targetSlots = getReservedSlots(target);
        if (targetSlots.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Reservation has no valid time slots");
            return response;
        }

        List<FltReservation> all = fltReservationRepository.findAllForConflictCheck();
        for (FltReservation other : all) {
            if (other.getId().equals(id)) continue;
            if (!"APPROVED".equals(other.getStatus()) && !"COMPLETED".equals(other.getStatus())) continue;
            if (ReservationSlotUtil.anyOverlap(targetSlots, getBlockingSlots(other))) {
                String reason = "Cannot approve — selected time overlaps an already approved reservation.";
                response.setSuccess(false);
                response.setBlockedReason(reason);
                response.setMessage(reason);
                return response;
            }
        }

        fltReservationRepository.approve(id, approvedBy != null ? approvedBy : "system");

        List<Long> conflictedIds = new ArrayList<>();
        for (FltReservation other : all) {
            if (other.getId().equals(id)) continue;
            if (!"PENDING".equals(other.getStatus())) continue;
            if (ReservationSlotUtil.anyOverlap(targetSlots, getReservedSlots(other))) {
                conflictedIds.add(other.getId());
            }
        }
        if (!conflictedIds.isEmpty()) {
            fltReservationRepository.updateStatusBatch(conflictedIds, "CONFLICT");
        }

        fltReservationRepository.findById(id).ifPresent(fltEmailService::sendApprovalEmail);
        for (Long cid : conflictedIds) {
            fltReservationRepository.findById(cid).ifPresent(fltEmailService::sendConflictEmail);
        }

        publishStatusEvent("flt", id, "APPROVED", conflictedIds);
        for (Long cid : conflictedIds) {
            publishStatusEvent("flt", cid, "CONFLICT", List.of());
        }

        auditService.log("FLT", "APPROVE", approvedBy, "reservation", id, target.getEventTitle(),
                AdminAuditService.detailsOf(
                        "previousStatus", "PENDING",
                        "newStatus", "APPROVED",
                        "conflictedIds", conflictedIds));

        response.setSuccess(true);
        response.setMessage("Status updated to APPROVED");
        response.setConflictedIds(conflictedIds);
        return response;
    }

    private List<ReservationSlot> getReservedSlots(FltReservation r) {
        return ReservationSlotUtil.parseReservedDates(r.getReservedDates(), objectMapper);
    }

    private List<ReservationSlot> getBlockingSlots(FltReservation r) {
        List<ReservationSlot> slots = new ArrayList<>(getReservedSlots(r));
        slots.addAll(ReservationSlotUtil.parseCoordination(
                r.getCoordinationDate(), r.getCoordinationStartTime(), r.getCoordinationEndTime()));
        return slots;
    }

    private void publishStatusEvent(String facility, Long reservationId, String status, List<Long> conflictedIds) {
        publishStatusEvent(facility, reservationId, status, conflictedIds, List.of());
    }

    private void publishStatusEvent(String facility, Long reservationId, String status,
            List<Long> conflictedIds, List<Long> revertedIds) {
        eventPublisher.publishStatusUpdate(facility, reservationId, status, conflictedIds, revertedIds);
    }

    private void publishRevertedConflicts(List<Long> revertedIds) {
        for (Long rid : revertedIds) {
            publishStatusEvent("flt", rid, "PENDING", List.of(), List.of());
        }
    }

    /** Revert CONFLICT rows that no longer overlap any APPROVED/COMPLETED reserved slot. */
    private List<Long> reEvaluateConflicts() {
        List<FltReservation> conflictRows = fltReservationRepository.findByStatus("CONFLICT");
        if (conflictRows.isEmpty()) {
            return List.of();
        }

        List<Long> toRevert = new ArrayList<>();
        for (FltReservation conflict : conflictRows) {
            List<ReservationSlot> conflictSlots = getReservedSlots(conflict);
            if (conflictSlots.isEmpty()) {
                toRevert.add(conflict.getId());
                continue;
            }
            boolean stillConflicts = false;
            for (FltReservation blocker : fltReservationRepository.findAllForConflictCheck()) {
                if (!"APPROVED".equals(blocker.getStatus()) && !"COMPLETED".equals(blocker.getStatus())) continue;
                if (ReservationSlotUtil.anyOverlap(conflictSlots, getReservedSlots(blocker))) {
                    stillConflicts = true;
                    break;
                }
            }
            if (!stillConflicts) {
                toRevert.add(conflict.getId());
            }
        }

        if (!toRevert.isEmpty()) {
            fltReservationRepository.updateStatusBatch(toRevert, "PENDING");
            logger.info("Reverted {} FLT CONFLICT reservation(s) to PENDING", toRevert.size());
        }
        return toRevert;
    }

    private void publishCreatedEvent(String facility, Long reservationId) {
        eventPublisher.publishCreated(facility, reservationId);
    }

    @Transactional
    public boolean saveRating(Long id, int rating) {
        try {
            fltReservationRepository.updateRating(id, rating);
            logger.info("Satisfaction rating {} saved for FLT reservation {}", rating, id);
            return true;
        } catch (Exception e) {
            logger.error("Failed to save satisfaction rating for FLT reservation {}", id, e);
            return false;
        }
    }

    @Transactional
    public boolean setCoordination(Long id, String date, String startTime, String endTime, String performedBy) {
        try {
            fltReservationRepository.updateCoordination(id, date, startTime, endTime);
            logger.info("Coordination meeting set for FLT reservation {} on {}", id, date);
            var opt = fltReservationRepository.findById(id);
            opt.ifPresent(r ->
                fltEmailService.sendCoordinationEmail(r, date, startTime, endTime)
            );
            publishStatusEvent("flt", id, "COORDINATION_SET", List.of());

            String label = opt.map(FltReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("FLT", "COORDINATION_SET", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "coordinationDate", date,
                            "startTime", startTime,
                            "endTime", endTime));

            return true;
        } catch (Exception e) {
            logger.error("Failed to set coordination for FLT reservation {}", id, e);
            return false;
        }
    }

    @Transactional
    public ReservationActionResponse reschedule(Long id, Object reservedDates, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = fltReservationRepository.findById(id);
            String previousDates = opt.map(FltReservation::getReservedDates).orElse(null);
            String label = opt.map(FltReservation::getEventTitle).orElse("Reservation #" + id);

            String json = objectMapper.writeValueAsString(reservedDates);
            fltReservationRepository.reschedule(id, json);
            logger.info("FLT reservation {} rescheduled", id);

            opt.ifPresent(r -> {
                r.setReservedDates(json);
                fltEmailService.sendRescheduleEmail(r, previousDates);
            });

            List<Long> revertedIds = reEvaluateConflicts();
            String status = fltReservationRepository.findById(id)
                    .map(FltReservation::getStatus)
                    .orElse("APPROVED");
            publishStatusEvent("flt", id, status, List.of(), revertedIds);
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }

            auditService.log("FLT", "RESCHEDULE", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "previousDates", previousDates,
                            "newDates", json,
                            "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Reservation rescheduled");
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to reschedule FLT reservation {}", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to reschedule reservation");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse updateDetails(Long id, org.lpu.dev.codes.model.dto.FltReservationDetailsEditRequest req, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = fltReservationRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            FltReservation r = opt.get();
            String status = r.getStatus() != null ? r.getStatus() : "";
            if (!Set.of("PENDING", "APPROVED", "CONFLICT").contains(status)) {
                response.setSuccess(false);
                response.setMessage("Only PENDING, APPROVED, or CONFLICT reservations can be edited");
                return response;
            }
            if (isBlank(req.getEventTitle()) || isBlank(req.getEventType()) || isBlank(req.getDepartment())
                    || isBlank(req.getOrganization()) || isBlank(req.getContactPerson())
                    || isBlank(req.getContactEmail()) || isBlank(req.getContactNumber())
                    || isBlank(req.getRoomType()) || req.getExpectedAttendees() == null) {
                response.setSuccess(false);
                response.setMessage("Required event fields are missing");
                return response;
            }

            String previousTitle = r.getEventTitle();
            r.setEventTitle(req.getEventTitle().trim());
            r.setEventType(req.getEventType().trim());
            r.setDepartment(req.getDepartment().trim());
            r.setOrganization(req.getOrganization().trim());
            r.setContactPerson(req.getContactPerson().trim());
            r.setContactEmail(req.getContactEmail().trim());
            r.setContactNumber(req.getContactNumber().trim());
            r.setRoomType(req.getRoomType().trim());
            r.setExpectedAttendees(req.getExpectedAttendees());
            r.setAdditionalInstructions(blankToNull(req.getAdditionalInstructions()));
            if (req.getRequestedEquipment() != null) {
                r.setRequestedEquipment(objectMapper.writeValueAsString(req.getRequestedEquipment()));
            }

            publishStatusEvent("flt", id, "DETAILS_UPDATED", List.of());
            auditService.log("FLT", "EDIT_DETAILS", performedBy, "reservation", id, r.getEventTitle(),
                    AdminAuditService.detailsOf(
                            "previousTitle", previousTitle,
                            "eventTitle", r.getEventTitle(),
                            "department", r.getDepartment(),
                            "contactEmail", r.getContactEmail()));

            response.setSuccess(true);
            response.setMessage("Event details updated");
            return response;
        } catch (Exception e) {
            logger.error("Failed to update FLT reservation {} details", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to update event details");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse deleteReservation(Long id, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = fltReservationRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            FltReservation r = opt.get();
            String label = r.getEventTitle() != null ? r.getEventTitle() : "Reservation #" + id;
            String previousStatus = r.getStatus();

            if (!fltReservationRepository.deleteById(id)) {
                response.setSuccess(false);
                response.setMessage("Failed to delete reservation");
                return response;
            }

            List<Long> revertedIds = reEvaluateConflicts();
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }
            publishStatusEvent("flt", id, "DELETED", List.of(), revertedIds);

            auditService.log("FLT", "DELETE", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf("previousStatus", previousStatus, "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Reservation deleted");
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to delete FLT reservation {}", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to delete reservation");
            return response;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional
    public boolean createReservation(FltReservationRequest req) {
        try {
            FltReservation reservation = new FltReservation();
            reservation.setEventTitle(req.getEventTitle());
            reservation.setEventType(req.getEventType());
            reservation.setDepartment(req.getDepartment());
            reservation.setOrganization(req.getOrganization());
            reservation.setContactPerson(req.getContactPerson());
            reservation.setContactEmail(req.getContactEmail());
            reservation.setContactNumber(req.getContactNumber());
            reservation.setRoomType(req.getRoomType());
            reservation.setExpectedAttendees(req.getExpectedAttendees());
            reservation.setAdditionalInstructions(req.getAdditionalInstructions());
            reservation.setReservedDates(objectMapper.writeValueAsString(req.getReservedDates()));
            if (req.getRequestedEquipment() != null) {
                reservation.setRequestedEquipment(objectMapper.writeValueAsString(req.getRequestedEquipment()));
            }
            fltReservationRepository.save(reservation);
            logger.info("FLT reservation created. Event: {}, Contact: {}", req.getEventTitle(), req.getContactEmail());
            fltEmailService.sendReservationConfirmation(reservation);
            publishCreatedEvent("flt", reservation.getId());
            return true;
        } catch (Exception e) {
            logger.error("Failed to create FLT reservation", e);
            return false;
        }
    }
}
