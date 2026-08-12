package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.Equipment;
import org.lpu.dev.codes.model.data.NexusReservation;
import org.lpu.dev.codes.model.dto.NexusApprovedEventDto;
import org.lpu.dev.codes.model.dto.NexusReservationAdminDto;
import org.lpu.dev.codes.model.dto.NexusReservationRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.repository.EquipmentRepository;
import org.lpu.dev.codes.repository.NexusReservationRepository;
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
public class NexusReservationService {

    private static final Logger logger = LogManager.getLogger(NexusReservationService.class);
    // Facility ID for Nexus Room → 3
    private static final Long NEXUS_FACILITY_ID = 3L;

    @Autowired private EquipmentRepository equipmentRepository;
    @Autowired private NexusReservationRepository gymRepository;
    @Autowired private NexusEmailService gymEmailService;
    @Autowired private ReservationEventPublisher eventPublisher;
    @Autowired private AdminAuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Equipment ────────────────────────────────────────────────────────────

    public List<PopulateEquipmentList> getGymEquipment() {
        List<Equipment> all = equipmentRepository.getEquipmentByFacility(NEXUS_FACILITY_ID);
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

    public List<NexusApprovedEventDto> getApprovedEvents() {
        List<NexusApprovedEventDto> result = new ArrayList<>();
        try {
            for (NexusReservation r : gymRepository.findAllApproved()) {
                if (r.getReservedDates() == null) continue;
                JsonNode array = objectMapper.readTree(r.getReservedDates());
                if (array.isArray()) {
                    for (JsonNode slot : array) {
                        String date      = slot.has("date")      ? slot.get("date").asText()      : null;
                        String startTime = slot.has("startTime") ? slot.get("startTime").asText() : null;
                        String endTime   = slot.has("endTime")   ? slot.get("endTime").asText()   : null;
                        if (date != null) {
                            result.add(new NexusApprovedEventDto(r.getEventTitle(), r.getDepartment(), r.getOrganization(), date, startTime, endTime, "RESERVATION"));
                        }
                    }
                }
                if (r.getCoordinationDate() != null && !r.getCoordinationDate().isEmpty()) {
                    result.add(new NexusApprovedEventDto("Coordination Meeting", r.getDepartment(), r.getOrganization(),
                        r.getCoordinationDate(), r.getCoordinationStartTime(), r.getCoordinationEndTime(), "COORDINATION"));
                }
            }
        } catch (Exception e) {
            logger.error("Error reading nexus approved events", e);
        }
        return result;
    }

    // ── Admin list ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NexusReservationAdminDto> getAllReservations(String month) {
        return getAllReservations(month, null, null);
    }

    @Transactional(readOnly = true)
    public List<NexusReservationAdminDto> getAllReservations(String month, String fromDate, String toDate) {
        List<Object[]> rows = gymRepository.findAllNative(month, fromDate, toDate);
        List<NexusReservationAdminDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            NexusReservationAdminDto dto = new NexusReservationAdminDto();
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
            dto.setCreatedAt(AppDateTimes.toApiUtc(row[11]));
            dto.setCoordinationDate((String) row[12]);
            dto.setCoordinationStartTime((String) row[13]);
            dto.setCoordinationEndTime((String) row[14]);
            dto.setSatisfactionRating(row[15] != null ? ((Number) row[15]).intValue() : null);
            dto.setAdditionalInstructions((String) row[16]);
            dto.setApprovedAt(AppDateTimes.toApiUtc(row[17]));
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
            publishStatusEvent("nexus", id, status, List.of(), revertedIds);

            String label = existingOpt.map(NexusReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("NEXUS", status, approvedBy, "reservation", id, label,
                    AdminAuditService.detailsOf("newStatus", status, "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Status updated to " + status);
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to update nexus reservation {} status", id, e);
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
        NexusReservation target = targetOpt.get();
        List<ReservationSlot> targetSlots = getReservedSlots(target);
        if (targetSlots.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Reservation has no valid time slots");
            return response;
        }

        List<NexusReservation> all = gymRepository.findAllForConflictCheck();
        for (NexusReservation other : all) {
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
        for (NexusReservation other : all) {
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

        publishStatusEvent("nexus", id, "APPROVED", conflictedIds);
        for (Long cid : conflictedIds) {
            publishStatusEvent("nexus", cid, "CONFLICT", List.of());
        }

        auditService.log("NEXUS", "APPROVE", approvedBy, "reservation", id, target.getEventTitle(),
                AdminAuditService.detailsOf(
                        "previousStatus", "PENDING",
                        "newStatus", "APPROVED",
                        "conflictedIds", conflictedIds));

        response.setSuccess(true);
        response.setMessage("Status updated to APPROVED");
        response.setConflictedIds(conflictedIds);
        return response;
    }

    private List<ReservationSlot> getReservedSlots(NexusReservation r) {
        return ReservationSlotUtil.parseReservedDates(r.getReservedDates(), objectMapper);
    }

    private List<ReservationSlot> getBlockingSlots(NexusReservation r) {
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
            publishStatusEvent("nexus", rid, "PENDING", List.of(), List.of());
        }
    }

    /** Revert CONFLICT rows that no longer overlap any APPROVED/COMPLETED reserved slot. */
    private List<Long> reEvaluateConflicts() {
        List<NexusReservation> conflictRows = gymRepository.findByStatus("CONFLICT");
        if (conflictRows.isEmpty()) {
            return List.of();
        }

        List<Long> toRevert = new ArrayList<>();
        for (NexusReservation conflict : conflictRows) {
            List<ReservationSlot> conflictSlots = getReservedSlots(conflict);
            if (conflictSlots.isEmpty()) {
                toRevert.add(conflict.getId());
                continue;
            }
            boolean stillConflicts = false;
            for (NexusReservation blocker : gymRepository.findAllForConflictCheck()) {
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
            logger.info("Reverted {} nexus CONFLICT reservation(s) to PENDING", toRevert.size());
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
            publishStatusEvent("nexus", id, "COORDINATION_SET", List.of());

            String label = opt.map(NexusReservation::getEventTitle).orElse("Reservation #" + id);
            auditService.log("NEXUS", "COORDINATION_SET", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "coordinationDate", date,
                            "startTime", startTime,
                            "endTime", endTime));

            return true;
        } catch (Exception e) {
            logger.error("Failed to set coordination for nexus reservation {}", id, e);
            return false;
        }
    }

    // ── Reschedule ────────────────────────────────────────────────────────────

    @Transactional
    public ReservationActionResponse reschedule(Long id, Object reservedDates, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = gymRepository.findById(id);
            String previousDates = opt.map(NexusReservation::getReservedDates).orElse(null);
            String label = opt.map(NexusReservation::getEventTitle).orElse("Reservation #" + id);

            String json = objectMapper.writeValueAsString(reservedDates);
            gymRepository.reschedule(id, json);
            logger.info("Nexus reservation {} rescheduled", id);

            opt.ifPresent(r -> {
                r.setReservedDates(json);
                gymEmailService.sendRescheduleEmail(r, previousDates);
            });

            List<Long> revertedIds = reEvaluateConflicts();
            String status = gymRepository.findById(id)
                    .map(NexusReservation::getStatus)
                    .orElse("APPROVED");
            publishStatusEvent("nexus", id, status, List.of(), revertedIds);
            if (!revertedIds.isEmpty()) {
                publishRevertedConflicts(revertedIds);
            }

            auditService.log("NEXUS", "RESCHEDULE", performedBy, "reservation", id, label,
                    AdminAuditService.detailsOf(
                            "previousDates", previousDates,
                            "newDates", json,
                            "revertedIds", revertedIds));

            response.setSuccess(true);
            response.setMessage("Reservation rescheduled");
            response.setRevertedIds(revertedIds);
            return response;
        } catch (Exception e) {
            logger.error("Failed to reschedule nexus reservation {}", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to reschedule reservation");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse updateDetails(Long id, org.lpu.dev.codes.model.dto.NexusReservationDetailsEditRequest req, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = gymRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            NexusReservation r = opt.get();
            String status = r.getStatus() != null ? r.getStatus() : "";
            if (!Set.of("PENDING", "APPROVED", "CONFLICT").contains(status)) {
                response.setSuccess(false);
                response.setMessage("Only PENDING, APPROVED, or CONFLICT reservations can be edited");
                return response;
            }
            if (req.getEventTitle() == null || req.getEventTitle().isBlank()
                    || req.getDepartment() == null || req.getDepartment().isBlank()
                    || req.getOrganization() == null || req.getOrganization().isBlank()
                    || req.getContactPerson() == null || req.getContactPerson().isBlank()
                    || req.getContactEmail() == null || req.getContactEmail().isBlank()
                    || req.getContactNumber() == null || req.getContactNumber().isBlank()
                    || req.getNumberOfAttendees() == null) {
                response.setSuccess(false);
                response.setMessage("Required event fields are missing");
                return response;
            }

            String previousTitle = r.getEventTitle();
            r.setEventTitle(req.getEventTitle().trim());
            r.setDepartment(req.getDepartment().trim());
            r.setOrganization(req.getOrganization().trim());
            r.setContactPerson(req.getContactPerson().trim());
            r.setContactEmail(req.getContactEmail().trim());
            r.setContactNumber(req.getContactNumber().trim());
            r.setNumberOfAttendees(req.getNumberOfAttendees());
            String instructions = req.getAdditionalInstructions();
            r.setAdditionalInstructions(instructions == null || instructions.isBlank() ? null : instructions.trim());
            if (req.getRequestedEquipment() != null) {
                r.setRequestedEquipment(objectMapper.writeValueAsString(req.getRequestedEquipment()));
            }

            publishStatusEvent("nexus", id, "DETAILS_UPDATED", List.of());
            auditService.log("NEXUS", "EDIT_DETAILS", performedBy, "reservation", id, r.getEventTitle(),
                    AdminAuditService.detailsOf(
                            "previousTitle", previousTitle,
                            "eventTitle", r.getEventTitle(),
                            "department", r.getDepartment(),
                            "contactEmail", r.getContactEmail()));

            response.setSuccess(true);
            response.setMessage("Event details updated");
            return response;
        } catch (Exception e) {
            logger.error("Failed to update nexus reservation {} details", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to update event details");
            return response;
        }
    }

    // ── Create reservation ────────────────────────────────────────────────────

    @Transactional
    public boolean createReservation(NexusReservationRequest req) {
        try {
            NexusReservation r = new NexusReservation();
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
            publishCreatedEvent("nexus", r.getId());
            logger.info("Nexus reservation created. Event: {}, Contact: {}", req.getEventTitle(), req.getContactEmail());
            return true;
        } catch (Exception e) {
            logger.error("Failed to create nexus reservation", e);
            return false;
        }
    }
}
