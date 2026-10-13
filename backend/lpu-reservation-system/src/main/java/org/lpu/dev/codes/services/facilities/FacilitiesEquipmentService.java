package org.lpu.dev.codes.services.facilities;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateEquipmentResponse;
import org.lpu.dev.codes.model.data.Equipment;
import org.lpu.dev.codes.model.data.Facility;
import org.lpu.dev.codes.model.dto.CreateEquipmentRequest;
import org.lpu.dev.codes.model.dto.PopulateEquipmentList;
import org.lpu.dev.codes.model.dto.UpdateEquipmentRequest;
import org.lpu.dev.codes.repository.EquipmentRepository;
import org.lpu.dev.codes.services.AdminAuditService;
import org.lpu.dev.codes.services.FacilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FacilitiesEquipmentService {

    private static final Logger logger = LogManager.getLogger(FacilitiesEquipmentService.class);

    /** Facility ids that host equipment. Van (2) does not. */
    public static Long facilityIdForService(String service) {
        if (service == null) {
            return null;
        }
        return switch (service.trim().toUpperCase(Locale.ROOT)) {
            case "FLT" -> 1L;
            case "NEXUS" -> 3L;
            case "BOARDROOM" -> 4L;
            case "GYMNASIUM" -> 5L;
            case "CONFERENCE" -> 6L;
            default -> null;
        };
    }

    public static Set<Long> facilityIdsForServices(Collection<String> services) {
        Set<Long> ids = new LinkedHashSet<>();
        if (services == null) {
            return ids;
        }
        for (String service : services) {
            Long id = facilityIdForService(service);
            if (id != null) {
                ids.add(id);
            }
        }
        return ids;
    }

    @Autowired
    private EquipmentRepository equipmentRepository;
    @Autowired
    private FacilityService facilityService;

    @Autowired
    private AdminAuditService auditService;

    private List<PopulateEquipmentList> mappedEquipmentList(List<Equipment> equipment) {
        return equipment.stream().map(item -> {
            PopulateEquipmentList dto = new PopulateEquipmentList();
            dto.setId(item.getId());
            dto.setName(item.getResource_name());
            dto.setStatus(item.getStatus());
            dto.setFacilityId(item.getFacility().getId());
            dto.setFacilityName(item.getFacility().getFacilityName());
            return dto;
        }).toList();
    }

    private boolean isAllowedFacility(Long facilityId, Set<Long> allowedFacilityIds) {
        return facilityId != null && allowedFacilityIds != null && allowedFacilityIds.contains(facilityId);
    }

    private boolean isManagedEquipment(Equipment equipment, Set<Long> allowedFacilityIds) {
        return equipment != null
                && equipment.getFacility() != null
                && isAllowedFacility(equipment.getFacility().getId(), allowedFacilityIds);
    }

    @Transactional(readOnly = true)
    public PopulateEquipmentResponse getEquipment(Set<Long> allowedFacilityIds) {
        PopulateEquipmentResponse response = new PopulateEquipmentResponse();
        try {
            List<Equipment> equipment = equipmentRepository.getEquipmentByFacilityIds(
                    List.copyOf(allowedFacilityIds == null ? Set.of() : allowedFacilityIds));
            response.setSuccess(true);
            response.setMessage("Get Equipment Success");
            response.setEquipment(mappedEquipmentList(equipment));
            return response;
        } catch (Exception e) {
            logger.error("Failed getting facilities equipment", e);
            response.setSuccess(false);
            response.setMessage("Database Failure");
            return response;
        }
    }

    @Transactional(readOnly = true)
    public List<Facility> getFacilities(Set<Long> allowedFacilityIds) {
        return facilityService.getAllFacility().stream()
                .filter(f -> isAllowedFacility(f.getId(), allowedFacilityIds))
                .toList();
    }

    @Transactional
    public EquipmentResponse toggleEquipmentStatus(Long equipId, String performedBy, Set<Long> allowedFacilityIds) {
        EquipmentResponse response = new EquipmentResponse();
        try {
            Equipment equipment = equipmentRepository.findById(equipId);
            if (!isManagedEquipment(equipment, allowedFacilityIds)) {
                response.setSuccess(false);
                response.setMessage("Equipment not found");
                return response;
            }

            String oldStatus = equipment.getStatus();
            String newStatus = "AVAILABLE".equalsIgnoreCase(oldStatus) ? "UNAVAILABLE" : "AVAILABLE";
            boolean updated = equipmentRepository.updateStatus(equipId, newStatus);

            if (updated) {
                auditService.log("EQUIPMENTS", "TOGGLE_STATUS", performedBy, "equipment", equipId,
                        equipment.getResource_name(),
                        AdminAuditService.detailsOf("previousStatus", oldStatus, "newStatus", newStatus));
            }

            response.setSuccess(updated);
            response.setMessage(updated
                    ? "Equipment status changed to " + newStatus
                    : "Failed to update equipment status");
            return response;
        } catch (Exception e) {
            logger.error("Error toggling facilities equipment status. Equipment ID: {}", equipId, e);
            response.setSuccess(false);
            response.setMessage("Failed to update equipment status");
            return response;
        }
    }

    @Transactional
    public EquipmentResponse deleteEquipment(Long equipId, String performedBy, Set<Long> allowedFacilityIds) {
        EquipmentResponse response = new EquipmentResponse();
        try {
            Equipment equipment = equipmentRepository.findById(equipId);
            if (!isManagedEquipment(equipment, allowedFacilityIds)) {
                response.setSuccess(false);
                response.setMessage("Equipment not found");
                return response;
            }

            boolean deleted = equipmentRepository.deleteById(equipId);
            if (deleted) {
                auditService.log("EQUIPMENTS", "DELETE", performedBy, "equipment", equipId,
                        equipment.getResource_name(), null);
            }
            response.setSuccess(deleted);
            response.setMessage(deleted ? "Equipment deleted successfully" : "Failed to delete equipment");
            return response;
        } catch (Exception e) {
            logger.error("Error deleting facilities equipment. Equipment ID: {}", equipId, e);
            response.setSuccess(false);
            response.setMessage("Failed to delete equipment");
            return response;
        }
    }

    @Transactional
    public EquipmentResponse createEquipment(
            CreateEquipmentRequest equipmentForm, String performedBy, Set<Long> allowedFacilityIds) {
        EquipmentResponse response = new EquipmentResponse();
        try {
            if (!isAllowedFacility(equipmentForm.getId(), allowedFacilityIds)) {
                response.setSuccess(false);
                response.setMessage("You can only add equipment for services assigned to your role");
                return response;
            }

            Facility facility = facilityService.getFacilitybyId(equipmentForm.getId());
            if (facility == null) {
                response.setSuccess(false);
                response.setMessage("Facility not found");
                return response;
            }

            Equipment equipment = new Equipment();
            equipment.setFacility(facility);
            equipment.setName(equipmentForm.getName());
            equipment.setStatus(equipmentForm.getStatus() != null ? equipmentForm.getStatus() : "AVAILABLE");
            equipmentRepository.save(equipment);

            auditService.log("EQUIPMENTS", "CREATE", performedBy, "equipment", equipment.getId(),
                    equipment.getResource_name(),
                    AdminAuditService.detailsOf(
                            "facilityId", facility.getId(),
                            "facilityName", facility.getFacilityName(),
                            "status", equipment.getStatus()));

            response.setSuccess(true);
            response.setMessage("Equipment created successfully");
            return response;
        } catch (Exception e) {
            logger.error("Error creating facilities equipment", e);
            response.setSuccess(false);
            response.setMessage("Failed to create equipment");
            return response;
        }
    }

    @Transactional
    public EquipmentResponse updateEquipment(
            UpdateEquipmentRequest equipmentForm, String performedBy, Set<Long> allowedFacilityIds) {
        EquipmentResponse response = new EquipmentResponse();
        try {
            Equipment equipment = equipmentRepository.findById(equipmentForm.getId());
            if (!isManagedEquipment(equipment, allowedFacilityIds)) {
                response.setSuccess(false);
                response.setMessage("Equipment not found");
                return response;
            }

            if (!isAllowedFacility(equipmentForm.getFacilityId(), allowedFacilityIds)) {
                response.setSuccess(false);
                response.setMessage("You can only assign equipment to services assigned to your role");
                return response;
            }

            Facility facility = facilityService.getFacilitybyId(equipmentForm.getFacilityId());
            if (facility == null) {
                response.setSuccess(false);
                response.setMessage("Facility not found");
                return response;
            }

            equipment.setName(equipmentForm.getName());
            equipment.setStatus(equipmentForm.getStatus());
            equipment.setFacility(facility);
            equipmentRepository.save(equipment);

            auditService.log("EQUIPMENTS", "UPDATE", performedBy, "equipment", equipment.getId(),
                    equipment.getResource_name(),
                    AdminAuditService.detailsOf(
                            "facilityId", facility.getId(),
                            "status", equipment.getStatus()));

            response.setSuccess(true);
            response.setMessage("Equipment updated successfully");
            return response;
        } catch (Exception e) {
            logger.error("Error updating facilities equipment. Equipment ID: {}", equipmentForm.getId(), e);
            response.setSuccess(false);
            response.setMessage("Failed to update equipment");
            return response;
        }
    }
}
