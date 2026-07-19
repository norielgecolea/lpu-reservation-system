package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.Equipment;
import org.lpu.dev.codes.model.data.GymnasiumReservation;
import org.lpu.dev.codes.model.dto.GymnasiumApprovedEventDto;
import org.lpu.dev.codes.model.dto.GymnasiumReservationAdminDto;
import org.lpu.dev.codes.model.dto.GymnasiumReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.repository.EquipmentRepository;
import org.lpu.dev.codes.repository.GymnasiumReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.util.ReservationSlot;
import org.lpu.dev.codes.util.ReservationSlotUtil;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class GymnasiumReservationService {

    private static final Logger logger = LogManager.getLogger(GymnasiumReservationService.class);
    // Facility ID for Gymnasium: SELECT id FROM facilities WHERE facility_name = 'Gymnasium' → 5
    private static final Long GYM_FACILITY_ID = 5L;

    @Autowired private EquipmentRepository equipmentRepository;
    @Autowired private GymnasiumReservationRepository gymRepository;
    @Autowired private GymnasiumEmailService gymEmailService;
    @Autowired private ReservationEventPublisher eventPublisher;
    @Autowired private AdminAuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Equipment ────────────────────────────────────────────────────────────

    public List<PopulateEquipmentList> getGymEquipment() {
        List<Equipment> all = equipmentRepository.getEquipmentByFacility(GYM_FACILITY_ID);
        List<PopulateEquipmentList> result = new ArrayList<>();
        for (Equipment e : all) {
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

    // ── Approved events (for calendar) ───────────────────────────────────────

    public List<GymnasiumApprovedEventDto> getApprovedEvents() {
        List<GymnasiumApprovedEventDto> result = new ArrayList<>();
        try {
            for (GymnasiumReservation r : gymRepository.findAllApproved()) {
                if (r.getReservedDates() == null) continue;
                JsonNode array = objectMapper.readTree(r.getReservedDates());
                if (array.isArray()) {
                    for (JsonNode slot : array) {
                        String date      = slot.has("date")      ? slot.get("date").asText()      : null;
                        String startTime = slot.has("startTime") ? slot.get("startTime").asText() : null;
                        String endTime   = slot.has("endTime")   ? slot.get("endTime").asText()   : null;
                        if (date != null) {
                            result.add(new GymnasiumApprovedEventDto(r.getEventTitle(), r.getDepartment(), r.getOrganization(), date, startTime, endTime, "RESERVATION"));
                        }
                    }
                }
                if (r.getCoordinationDate() != null && !r.getCoordinationDate().isEmpty()) {
                    result.add(new GymnasiumApprovedEventDto("Coordination Meeting", r.getDepartment(), r.getOrganization(),
                        r.getCoordinationDate(), r.getCoordinationStartTime(), r.getCoordinationEndTime(), "COORDINATION"));
                }
            }
        } catch (Exception e) {
            logger.error("Error reading gymnasium approved events", e);
        }
        return result;
    }

    // ── Admin list ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<GymnasiumReservationAdminDto> getAllReservations() {
        return getAllReservations(null);
    }

    @Transactional(readOnly = true)
    public List<GymnasiumReservationAdminDto> getAllReservations(String month) {
        List<Object[]> rows = gymRepository.findAllNative(month);
        List<GymnasiumReservationAdminDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            GymnasiumReservationAdminDto dto = new GymnasiumReservationAdminDto();
            dto.setId(row[0] != null ? ((Number) row[0]).longValue() : null);
            dto.setEventTitle((String) row[1]);
            dto.setDepartment((String) row[2]);
            dto.setOrganization((String) row[3]);
            dto.setNumberOfAttendees(row[4] != null ? row[4].toString() : null);
            dto.setContactPerson((String) row[5]);
            dto.setContactEmail((String) row[6]);
            dto.setContactNumber((String) row[7]);
            dto.setReservedDates((String) row[8]);
            dto.setRequestedEquipment((String) row[9]);
            dto.setStatus((String) row[10]);
            dto.setCreatedAt(row[11] != null ? row[11].toString() : null);
            dto.setCoordinationDate((String) row[12]);
            dto.setCoordinationStartTime((String) row[13]);
            dto.setCoordinationEndTime((String) row[14]);
            dto.setSatisfactionRating(row[15] != null ? ((Number) row[15]).intValue() : null);
            dto.setAdditionalInstructions((String) row[16]);
            dto.setApprovedAt(row[17] != null ? row[17].toString() : null);
            dto.setApprovedBy((String) row[18]);
            result.add(dto);
        }
        return result;
    }

    // ── Status update ─────────────────────────────────────────────────────────

    @Transactional
    public ReservationActionResponse updateStatus(Long id, String status, String approvedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        List<String> allowed = java.util.Arrays.asList("APPROVED", "REJECTED", "CANCELLED", "COMPLETED");
        if (!allowed.contains(status)) {
            response.setSuccess(false);
            response.setMessage("Invalid status");
            return response;
        }
        try {
            if ("APPROVED".equals(status)) {
                return approveReservation(id, approvedBy);
            }
            gymRepository.updateStatus(id, status);
            var existingOpt = gymRepository.findById(id);
            existingOpt.ifPresent(r -> {
                switch (status) {
                    case "REJECTED"  -> gymEmailService.sendRejectionEmail(r);
                    case "CANCELLED" -> gymEmailService.sendCancellationEmail(r);
                    case "COMPLETED" -> gymEmailService.sendSatisfactionSurvey(r);
                }
            });
            List<Long> revertedIds = "CANCELLED".equals(status) ? reEvaluateConflicts() : List.of();
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }
            publishStatusEvent("gymnasium", id, status, List.of(), revertedIds);

            String label = existingOpt.map(GymnasiumReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("GYMNASIUM", status, approvedBy, "reservation", id, label,
                    AdminAuditService.detailsOf("newStatus", status, "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Status updated to " + status);
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to update gymnasium reservation {} status", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to update status");
            return response;
        }
    }

    private ReservationActionResponse approveReservation(Long id, String approvedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        var targetOpt = gymRepository.findById(id);
        if (targetOpt.isEmpty() || !"PENDING".equals(targetOpt.get().getStatus())) {
            response.setSuccess(false);
            response.setMessage("Only pending reservations can be approved");
            return response;
        }
        GymnasiumReservation target = targetOpt.get();
        List<ReservationSlot> targetSlots = getReservedSlots(target);
        if (targetSlots.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Reservation has no valid time slots");
            return response;
        }

        List<GymnasiumReservation> all = gymRepository.findAllForConflictCheck();
        for (GymnasiumReservation other : all) {
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

        gymRepository.approve(id, approvedBy != null ? approvedBy : "system");

        List<Long> conflictedIds = new ArrayList<>();
        for (GymnasiumReservation other : all) {
            if (other.getId().equals(id)) continue;
            if (!"PENDING".equals(other.getStatus())) continue;
            if (ReservationSlotUtil.anyOverlap(targetSlots, getReservedSlots(other))) {
                conflictedIds.add(other.getId());
            }
        }
        if (!conflictedIds.isEmpty()) {
            gymRepository.updateStatusBatch(conflictedIds, "CONFLICT");
        }

        gymRepository.findById(id).ifPresent(gymEmailService::sendApprovalEmail);
        for (Long cid : conflictedIds) {
            gymRepository.findById(cid).ifPresent(gymEmailService::sendConflictEmail);
        }

        publishStatusEvent("gymnasium", id, "APPROVED", conflictedIds);
        for (Long cid : conflictedIds) {
            publishStatusEvent("gymnasium", cid, "CONFLICT", List.of());
        }

        auditService.log("GYMNASIUM", "APPROVE", approvedBy, "reservation", id, target.getEventTitle(),
                AdminAuditService.detailsOf(
                        "previousStatus", "PENDING",
                        "newStatus", "APPROVED",
                        "conflictedIds", conflictedIds));

        response.setSuccess(true);
        response.setMessage("Status updated to APPROVED");
        response.setConflictedIds(conflictedIds);
        return response;
    }

    private List<ReservationSlot> getReservedSlots(GymnasiumReservation r) {
        return ReservationSlotUtil.parseReservedDates(r.getReservedDates(), objectMapper);
    }

    private List<ReservationSlot> getBlockingSlots(GymnasiumReservation r) {
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
            publishStatusEvent("gymnasium", rid, "PENDING", List.of(), List.of());
        }
    }

    /** Revert CONFLICT rows that no longer overlap any APPROVED/COMPLETED reserved slot. */
    private List<Long> reEvaluateConflicts() {
        List<GymnasiumReservation> conflictRows = gymRepository.findByStatus("CONFLICT");
        if (conflictRows.isEmpty()) {
            return List.of();
        }

        List<Long> toRevert = new ArrayList<>();
        for (GymnasiumReservation conflict : conflictRows) {
            List<ReservationSlot> conflictSlots = getReservedSlots(conflict);
            if (conflictSlots.isEmpty()) {
                toRevert.add(conflict.getId());
                continue;
            }
            boolean stillConflicts = false;
            for (GymnasiumReservation blocker : gymRepository.findAllForConflictCheck()) {
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
            gymRepository.updateStatusBatch(toRevert, "PENDING");
            logger.info("Reverted {} gymnasium CONFLICT reservation(s) to PENDING", toRevert.size());
        }
        return toRevert;
    }

    private void publishCreatedEvent(String facility, Long reservationId) {
        eventPublisher.publishCreated(facility, reservationId);
    }

    // ── Coordination ──────────────────────────────────────────────────────────

    @Transactional
    public boolean setCoordination(Long id, String date, String startTime, String endTime, String performedBy) {
        try {
            gymRepository.updateCoordination(id, date, startTime, endTime);
            var opt = gymRepository.findById(id);
            opt.ifPresent(r ->
                gymEmailService.sendCoordinationEmail(r, date, startTime, endTime));
            publishStatusEvent("gymnasium", id, "COORDINATION_SET", List.of());

            String label = opt.map(GymnasiumReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("GYMNASIUM", "COORDINATION_SET", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "coordinationDate", date,
                            "startTime", startTime,
                            "endTime", endTime));

            return true;
        } catch (Exception e) {
            logger.error("Failed to set coordination for gymnasium reservation {}", id, e);
            return false;
        }
    }

    // ── Reschedule ────────────────────────────────────────────────────────────

    @Transactional
    public ReservationActionResponse reschedule(Long id, Object reservedDates, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = gymRepository.findById(id);
            String previousDates = opt.map(GymnasiumReservation::getReservedDates).orElse(null);
            String label = opt.map(GymnasiumReservation::getEventTitle).orElse("Reservation #" + id);

            String json = objectMapper.writeValueAsString(reservedDates);
            gymRepository.reschedule(id, json);
            logger.info("Gymnasium reservation {} rescheduled", id);

            List<Long> revertedIds = reEvaluateConflicts();
            String status = gymRepository.findById(id)
                    .map(GymnasiumReservation::getStatus)
                    .orElse("APPROVED");
            publishStatusEvent("gymnasium", id, status, List.of(), revertedIds);
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }

            auditService.log("GYMNASIUM", "RESCHEDULE", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "previousDates", previousDates,
                            "newDates", json,
                            "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Reservation rescheduled");
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to reschedule gymnasium reservation {}", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to reschedule reservation");
            return response;
        }
    }

    // ── Create reservation ────────────────────────────────────────────────────

    @Transactional
    public boolean createReservation(GymnasiumReservationRequest req) {
        try {
            GymnasiumReservation r = new GymnasiumReservation();
            r.setEventTitle(req.getEventTitle());
            r.setDepartment(req.getDepartment());
            r.setOrganization(req.getOrganization());
            r.setNumberOfAttendees(req.getNumberOfAttendees());
            r.setContactPerson(req.getContactPerson());
            r.setContactEmail(req.getContactEmail());
            r.setContactNumber(req.getContactNumber());
            r.setAdditionalInstructions(req.getAdditionalInstructions());
            r.setReservedDates(objectMapper.writeValueAsString(req.getReservedDates()));
            if (req.getRequestedEquipment() != null) {
                r.setRequestedEquipment(objectMapper.writeValueAsString(req.getRequestedEquipment()));
            }
            gymRepository.save(r);
            gymEmailService.sendReservationConfirmation(r);
            publishCreatedEvent("gymnasium", r.getId());
            logger.info("Gymnasium reservation created. Event: {}, Contact: {}", req.getEventTitle(), req.getContactEmail());
            return true;
        } catch (Exception e) {
            logger.error("Failed to create gymnasium reservation", e);
            return false;
        }
    }
}
