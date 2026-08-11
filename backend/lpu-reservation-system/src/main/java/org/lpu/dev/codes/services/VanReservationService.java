package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.ReservationActionResponse;
import org.lpu.dev.codes.model.data.VanReservation;
import org.lpu.dev.codes.model.data.Vehicle;
import org.lpu.dev.codes.model.dto.PopulateVehicleList;
import org.lpu.dev.codes.model.dto.VanApprovedEventDto;
import org.lpu.dev.codes.model.dto.VanReservationAdminDto;
import org.lpu.dev.codes.model.dto.VanReservationRequest;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.repository.VanReservationRepository;
import org.lpu.dev.codes.repository.VehicleRepository;
import org.lpu.dev.codes.services.superadmin.SuperAdminVehicleService;
import org.lpu.dev.codes.util.AppDateTimes;
import org.lpu.dev.codes.util.ReservationSlot;
import org.lpu.dev.codes.util.ReservationSlotUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class VanReservationService {

    private static final Logger logger = LogManager.getLogger(VanReservationService.class);
    private static final Long VAN_FACILITY_ID = 2L;

    @Autowired private VanReservationRepository vanRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private SuperAdminVehicleService vehicleService;
    @Autowired private VanEmailService vanEmailService;
    @Autowired private AllowedReservationEmailService allowedEmailService;
    @Autowired private ReservationEventPublisher eventPublisher;
    @Autowired private AdminAuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<PopulateVehicleList> getAvailableVehicles() {
        List<Vehicle> vehicles = vehicleRepository.getVehiclesByFacility(VAN_FACILITY_ID);
        List<Vehicle> available = new ArrayList<>();
        for (Vehicle v : vehicles) {
            if ("AVAILABLE".equalsIgnoreCase(v.getStatus())) {
                available.add(v);
            }
        }
        return vehicleService.mappedVehicleList(available);
    }

    @Transactional(readOnly = true)
    public List<PopulateVehicleList> getAvailableVehiclesForReservation(Long reservationId) {
        var targetOpt = vanRepository.findById(reservationId);
        if (targetOpt.isEmpty()) {
            return List.of();
        }
        List<ReservationSlot> targetSlots = getReservedSlots(targetOpt.get());
        if (targetSlots.isEmpty()) {
            return List.of();
        }

        List<Vehicle> vehicles = vehicleRepository.getVehiclesByFacility(VAN_FACILITY_ID);
        List<Vehicle> available = new ArrayList<>();
        for (Vehicle v : vehicles) {
            if (!"AVAILABLE".equalsIgnoreCase(v.getStatus())) {
                continue;
            }
            if (!hasScheduleOverlap(vanRepository.findApprovedByVehicleId(v.getId()), targetSlots, reservationId)) {
                available.add(v);
            }
        }
        return vehicleService.mappedVehicleList(available);
    }

    @Transactional(readOnly = true)
    public List<VanApprovedEventDto> getApprovedEvents() {
        List<VanApprovedEventDto> result = new ArrayList<>();
        try {
            for (VanReservation r : vanRepository.findAllApproved()) {
                appendSlots(result, r);
            }
        } catch (Exception e) {
            logger.error("Error reading van approved events", e);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<VanApprovedEventDto> getVehicleSchedule(Long vehicleId) {
        return getVehicleSchedule(vehicleId, null);
    }

    @Transactional(readOnly = true)
    public List<VanApprovedEventDto> getVehicleSchedule(Long vehicleId, Long excludeReservationId) {
        List<VanApprovedEventDto> result = new ArrayList<>();
        try {
            for (VanReservation r : vanRepository.findApprovedByVehicleId(vehicleId)) {
                if (excludeReservationId != null && excludeReservationId.equals(r.getId())) {
                    continue;
                }
                appendSlots(result, r);
            }
        } catch (Exception e) {
            logger.error("Error reading vehicle schedule {}", vehicleId, e);
        }
        return result;
    }

    private void appendSlots(List<VanApprovedEventDto> result, VanReservation r) throws Exception {
        if (r.getReservedDates() == null) return;
        String vehicleLabel = r.formatVehicleLabels();
        Vehicle primary = r.getPrimaryVehicle();
        Long vehicleId = primary != null ? primary.getId() : null;
        String driverName = r.formatDriverNames();
        JsonNode array = objectMapper.readTree(r.getReservedDates());
        if (array.isArray()) {
            for (JsonNode slot : array) {
                String date = slot.has("date") ? slot.get("date").asText() : null;
                String startTime = slot.has("startTime") ? slot.get("startTime").asText() : null;
                String endTime = slot.has("endTime") ? slot.get("endTime").asText() : null;
                if (date != null) {
                    result.add(new VanApprovedEventDto(
                            r.getDepartment(), r.getOrganization(), r.getTravelDestination(),
                            date, startTime, endTime, vehicleId, vehicleLabel, driverName, "RESERVATION",
                            r.getId()));
                }
            }
        }
    }

    @Transactional(readOnly = true)
    public List<VanReservationAdminDto> getAllReservations(String month) {
        return getAllReservations(month, null, null);
    }

    @Transactional(readOnly = true)
    public List<VanReservationAdminDto> getAllReservations(String month, String fromDate, String toDate) {
        List<Object[]> rows = vanRepository.findAllNative(month, fromDate, toDate);
        List<VanReservationAdminDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            VanReservationAdminDto dto = new VanReservationAdminDto();
            dto.setId(row[0] != null ? ((Number) row[0]).longValue() : null);
            dto.setDepartment((String) row[1]);
            dto.setOrganization((String) row[2]);
            dto.setTravelDestination((String) row[3]);
            dto.setPassengerNames((String) row[4]);
            dto.setNumberOfPassengers(row[5] != null ? ((Number) row[5]).intValue() : null);
            dto.setReturnTime((String) row[6]);
            dto.setContactPerson((String) row[7]);
            dto.setContactEmail((String) row[8]);
            dto.setContactNumber((String) row[9]);
            dto.setReservedDates((String) row[10]);
            dto.setStatus((String) row[11]);
            dto.setCreatedAt(AppDateTimes.toApiUtc(row[12]));
            dto.setSatisfactionRating(row[13] != null ? ((Number) row[13]).intValue() : null);
            List<Long> vehicleIds = parseIdList((String) row[14]);
            dto.setVehicleIds(vehicleIds);
            dto.setVehicleId(vehicleIds.isEmpty() ? null : vehicleIds.get(0));
            dto.setVehicleLabel((String) row[15]);
            dto.setDriverName((String) row[16]);
            dto.setApprovedAt(AppDateTimes.toApiUtc(row[17]));
            dto.setApprovedBy((String) row[18]);
            dto.setAdditionalRemarks((String) row[19]);
            dto.setSchool(row.length > 20 ? (String) row[20] : null);
            dto.setRequestedVehicleType(row.length > 21 ? (String) row[21] : null);
            result.add(dto);
        }
        return result;
    }

    @Transactional
    public EquipmentResponse createReservation(VanReservationRequest req) {
        EquipmentResponse response = new EquipmentResponse();
        String emailError = allowedEmailService.validateRestrictedServiceEmail(req.getContactEmail());
        if (emailError != null) {
            response.setSuccess(false);
            response.setMessage(emailError);
            return response;
        }

        try {
            VanReservation r = new VanReservation();
            r.setDepartment(req.getDepartment());
            r.setOrganization(req.getOrganization());
            r.setTravelDestination(req.getTravelDestination());
            r.setPassengerNames(req.getPassengerNames());
            r.setNumberOfPassengers(req.getNumberOfPassengers() != null ? req.getNumberOfPassengers() : 1);
            r.setReturnTime(extractReturnTime(req));
            r.setContactPerson(req.getContactPerson());
            r.setContactEmail(allowedEmailService.normalizeEmail(req.getContactEmail()));
            r.setContactNumber(req.getContactNumber());
            r.setReservedDates(objectMapper.writeValueAsString(req.getReservedDates()));
            r.setAdditionalRemarks(req.getAdditionalRemarks());
            r.setSchool(normalizeSchool(req.getSchool()));
            r.setRequestedVehicleType(req.getRequestedVehicleType());
            vanRepository.save(r);
            vanEmailService.sendReservationConfirmation(r);
            eventPublisher.publishCreated("van", r.getId());
            logger.info("Van reservation created for {}", req.getContactEmail());
            response.setSuccess(true);
            response.setMessage("Reservation submitted successfully");
            return response;
        } catch (Exception e) {
            logger.error("Failed to create van reservation", e);
            response.setSuccess(false);
            response.setMessage("Failed to submit reservation");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse approveReservation(Long id, List<Long> vehicleIds, String approvedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        var targetOpt = vanRepository.findById(id);
        if (targetOpt.isEmpty() || !"PENDING".equals(targetOpt.get().getStatus())) {
            response.setSuccess(false);
            response.setMessage("Only pending reservations can be approved");
            return response;
        }

        VanReservation target = targetOpt.get();
        LinkedHashSet<Vehicle> vehicles = resolveVehicles(vehicleIds, response);
        if (vehicles == null) {
            return response;
        }

        ReservationActionResponse validation = validateVehicleAssignments(target, vehicles, null);
        if (!validation.isSuccess()) {
            return validation;
        }

        target.getAssignedVehicles().clear();
        target.getAssignedVehicles().addAll(vehicles);
        vanRepository.merge(target);
        vanRepository.approveWithVehicles(id, approvedBy != null ? approvedBy : "system");
        vanRepository.findById(id).ifPresent(vanEmailService::sendApprovalEmail);
        eventPublisher.publishStatusUpdate("van", id, "APPROVED", List.of());

        auditService.log("VAN", "APPROVE", approvedBy, "reservation", id, reservationLabel(target),
                AdminAuditService.detailsOf(
                        "vehicleIds", vehicleIds,
                        "previousStatus", "PENDING",
                        "newStatus", "APPROVED"));

        response.setSuccess(true);
        response.setMessage("Reservation approved with vehicle(s) assigned");
        return response;
    }

    @Transactional
    public ReservationActionResponse reassignVehicles(Long id, List<Long> vehicleIds, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        var targetOpt = vanRepository.findById(id);
        if (targetOpt.isEmpty() || !"APPROVED".equals(targetOpt.get().getStatus())) {
            response.setSuccess(false);
            response.setMessage("Only approved reservations can change assigned vehicles");
            return response;
        }

        VanReservation target = targetOpt.get();
        LinkedHashSet<Vehicle> vehicles = resolveVehicles(vehicleIds, response);
        if (vehicles == null) {
            return response;
        }

        ReservationActionResponse validation = validateVehicleAssignments(target, vehicles, id);
        if (!validation.isSuccess()) {
            return validation;
        }

        target.getAssignedVehicles().clear();
        target.getAssignedVehicles().addAll(vehicles);
        vanRepository.merge(target);
        eventPublisher.publishStatusUpdate("van", id, "APPROVED", List.of());

        auditService.log("VAN", "REASSIGN", performedBy, "reservation", id, reservationLabel(target),
                AdminAuditService.detailsOf("vehicleIds", vehicleIds));

        response.setSuccess(true);
        response.setMessage("Assigned vehicle(s) updated successfully");
        return response;
    }

    /** Returns null and fills {@code response} on failure. */
    private LinkedHashSet<Vehicle> resolveVehicles(List<Long> vehicleIds, ReservationActionResponse response) {
        if (vehicleIds == null || vehicleIds.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("At least one vehicle is required");
            return null;
        }
        LinkedHashSet<Long> uniqueIds = new LinkedHashSet<>(vehicleIds);
        LinkedHashSet<Vehicle> vehicles = new LinkedHashSet<>();
        for (Long vehicleId : uniqueIds) {
            if (vehicleId == null) {
                continue;
            }
            Vehicle vehicle = vehicleRepository.findById(vehicleId);
            if (vehicle == null || !"AVAILABLE".equalsIgnoreCase(vehicle.getStatus())) {
                response.setSuccess(false);
                response.setMessage("Selected vehicle is not available");
                return null;
            }
            vehicles.add(vehicle);
        }
        if (vehicles.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("At least one vehicle is required");
            return null;
        }
        return vehicles;
    }

    private ReservationActionResponse validateVehicleAssignments(
            VanReservation target, Set<Vehicle> vehicles, Long excludeReservationId) {
        ReservationActionResponse response = new ReservationActionResponse();

        List<ReservationSlot> targetSlots = getReservedSlots(target);
        if (targetSlots.isEmpty()) {
            response.setSuccess(false);
            response.setMessage("Reservation has no valid time slots");
            return response;
        }

        for (Vehicle vehicle : vehicles) {
            for (VanReservation other : vanRepository.findApprovedByVehicleId(vehicle.getId())) {
                if (excludeReservationId != null && excludeReservationId.equals(other.getId())) {
                    continue;
                }
                if (ReservationSlotUtil.anyOverlap(targetSlots, getReservedSlots(other))) {
                    String label = vehicle.getBrand() + " (" + vehicle.getPlateNum() + ")";
                    String reason = "Cannot assign — " + label + " has an overlapping trip.";
                    response.setSuccess(false);
                    response.setBlockedReason(reason);
                    response.setMessage(reason);
                    return response;
                }
            }
        }

        response.setSuccess(true);
        return response;
    }

    @Transactional
    public ReservationActionResponse updateStatus(Long id, String status, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        List<String> allowed = List.of("REJECTED", "CANCELLED", "COMPLETED");
        if (!allowed.contains(status)) {
            response.setSuccess(false);
            response.setMessage("Invalid status. Use approve endpoint for APPROVED.");
            return response;
        }
        try {
            var opt = vanRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            VanReservation existing = opt.get();
            String previousStatus = existing.getStatus();
            vanRepository.updateStatus(id, status);
            vanRepository.findById(id).ifPresent(r -> {
                switch (status) {
                    case "REJECTED" -> vanEmailService.sendRejectionEmail(r);
                    case "CANCELLED" -> vanEmailService.sendCancellationEmail(r);
                    case "COMPLETED" -> vanEmailService.sendSatisfactionSurvey(r);
                }
            });
            eventPublisher.publishStatusUpdate("van", id, status, List.of());

            auditService.log("VAN", status, performedBy, "reservation", id, reservationLabel(existing),
                    AdminAuditService.detailsOf("previousStatus", previousStatus, "newStatus", status));

            response.setSuccess(true);
            response.setMessage("Status updated to " + status);
            return response;
        } catch (Exception e) {
            logger.error("Failed to update van reservation {} status", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to update status");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse reschedule(Long id, Object reservedDates, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            String json = objectMapper.writeValueAsString(reservedDates);
            String returnTime = extractReturnTimeFromJson(json);
            var opt = vanRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            VanReservation existing = opt.get();
            String previousDates = existing.getReservedDates();
            List<ReservationSlot> newSlots = ReservationSlotUtil.parseReservedDates(json, objectMapper);

            if ("APPROVED".equals(existing.getStatus()) || "COMPLETED".equals(existing.getStatus())) {
                if (existing.getAssignedVehicles() != null) {
                    for (Vehicle vehicle : existing.getAssignedVehicles()) {
                        for (VanReservation other : vanRepository.findApprovedByVehicleId(vehicle.getId())) {
                            if (other.getId().equals(id)) continue;
                            if (ReservationSlotUtil.anyOverlap(newSlots, getReservedSlots(other))) {
                                response.setSuccess(false);
                                response.setBlockedReason("Reschedule conflicts with assigned vehicle schedule");
                                response.setMessage("Reschedule conflicts with assigned vehicle schedule");
                                return response;
                            }
                        }
                    }
                }
            }

            vanRepository.reschedule(id, json, returnTime);
            existing.setReservedDates(json);
            existing.setReturnTime(returnTime);
            vanEmailService.sendRescheduleEmail(existing, previousDates);

            String status = existing.getStatus();
            eventPublisher.publishStatusUpdate("van", id, status, List.of());

            auditService.log("VAN", "RESCHEDULE", performedBy, "reservation", id, reservationLabel(existing),
                    AdminAuditService.detailsOf(
                            "previousDates", previousDates,
                            "newDates", json,
                            "status", status));

            response.setSuccess(true);
            response.setMessage("Reservation rescheduled");
            return response;
        } catch (Exception e) {
            logger.error("Failed to reschedule van reservation {}", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to reschedule reservation");
            return response;
        }
    }

    @Transactional
    public ReservationActionResponse updateDetails(Long id, org.lpu.dev.codes.model.dto.VanReservationDetailsEditRequest req, String performedBy) {
        ReservationActionResponse response = new ReservationActionResponse();
        try {
            var opt = vanRepository.findById(id);
            if (opt.isEmpty()) {
                response.setSuccess(false);
                response.setMessage("Reservation not found");
                return response;
            }
            VanReservation r = opt.get();
            String status = r.getStatus() != null ? r.getStatus() : "";
            if (!Set.of("PENDING", "APPROVED", "CONFLICT").contains(status)) {
                response.setSuccess(false);
                response.setMessage("Only PENDING, APPROVED, or CONFLICT reservations can be edited");
                return response;
            }
            if (req.getDepartment() == null || req.getDepartment().isBlank()
                    || req.getOrganization() == null || req.getOrganization().isBlank()
                    || req.getTravelDestination() == null || req.getTravelDestination().isBlank()
                    || req.getPassengerNames() == null || req.getPassengerNames().isBlank()
                    || req.getNumberOfPassengers() == null
                    || req.getContactPerson() == null || req.getContactPerson().isBlank()
                    || req.getContactEmail() == null || req.getContactEmail().isBlank()
                    || req.getContactNumber() == null || req.getContactNumber().isBlank()) {
                response.setSuccess(false);
                response.setMessage("Required trip fields are missing");
                return response;
            }

            String previousDest = r.getTravelDestination();
            if (req.getSchool() != null && !req.getSchool().isBlank()) {
                r.setSchool(req.getSchool().trim());
            }
            r.setDepartment(req.getDepartment().trim());
            r.setOrganization(req.getOrganization().trim());
            r.setTravelDestination(req.getTravelDestination().trim());
            r.setPassengerNames(req.getPassengerNames().trim());
            r.setNumberOfPassengers(req.getNumberOfPassengers());
            r.setContactPerson(req.getContactPerson().trim());
            r.setContactEmail(req.getContactEmail().trim());
            r.setContactNumber(req.getContactNumber().trim());
            String remarks = req.getAdditionalRemarks();
            r.setAdditionalRemarks(remarks == null || remarks.isBlank() ? null : remarks.trim());
            if (req.getRequestedVehicleType() != null) {
                String vt = req.getRequestedVehicleType().trim();
                r.setRequestedVehicleType(vt.isEmpty() ? null : vt);
            }

            eventPublisher.publishStatusUpdate("van", id, "DETAILS_UPDATED", List.of());
            auditService.log("VAN", "EDIT_DETAILS", performedBy, "reservation", id, reservationLabel(r),
                    AdminAuditService.detailsOf(
                            "previousDestination", previousDest,
                            "travelDestination", r.getTravelDestination(),
                            "department", r.getDepartment(),
                            "contactEmail", r.getContactEmail()));

            response.setSuccess(true);
            response.setMessage("Trip details updated");
            return response;
        } catch (Exception e) {
            logger.error("Failed to update van reservation {} details", id, e);
            response.setSuccess(false);
            response.setMessage("Failed to update trip details");
            return response;
        }
    }

    private List<ReservationSlot> getReservedSlots(VanReservation r) {
        return ReservationSlotUtil.parseReservedDates(r.getReservedDates(), objectMapper);
    }

    private boolean hasScheduleOverlap(List<VanReservation> existingTrips, List<ReservationSlot> targetSlots) {
        return hasScheduleOverlap(existingTrips, targetSlots, null);
    }

    private boolean hasScheduleOverlap(
            List<VanReservation> existingTrips, List<ReservationSlot> targetSlots, Long excludeReservationId) {
        for (VanReservation other : existingTrips) {
            if (excludeReservationId != null && excludeReservationId.equals(other.getId())) {
                continue;
            }
            if (ReservationSlotUtil.anyOverlap(targetSlots, getReservedSlots(other))) {
                return true;
            }
        }
        return false;
    }

    private String reservationLabel(VanReservation r) {
        if (r.getTravelDestination() != null && !r.getTravelDestination().isBlank()) {
            return r.getTravelDestination();
        }
        return r.getDepartment() + " — " + r.getOrganization();
    }

    private List<Long> parseIdList(String csv) {
        List<Long> ids = new ArrayList<>();
        if (csv == null || csv.isBlank()) {
            return ids;
        }
        for (String part : csv.split(",")) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) continue;
            try {
                ids.add(Long.parseLong(trimmed));
            } catch (NumberFormatException ignored) {
                // skip malformed token
            }
        }
        return ids;
    }

    private String extractReturnTime(VanReservationRequest req) {
        if (req.getReturnTime() != null && !req.getReturnTime().isBlank()) {
            return req.getReturnTime();
        }
        if (req.getReservedDates() == null || req.getReservedDates().isEmpty()) return null;
        return req.getReservedDates().get(req.getReservedDates().size() - 1).getEndTime();
    }

    private String extractReturnTimeFromJson(String json) {
        try {
            JsonNode array = objectMapper.readTree(json);
            if (!array.isArray() || array.isEmpty()) return null;
            JsonNode last = array.get(array.size() - 1);
            return last.has("endTime") ? last.get("endTime").asText() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String normalizeSchool(String school) {
        if (school == null) return "LPU-L";
        String normalized = school.trim().toUpperCase();
        if ("LPU-SC".equals(normalized) || "LPU SC".equals(normalized) || "LPUSC".equals(normalized)) {
            return "LPU-SC";
        }
        return "LPU-L";
    }
}
