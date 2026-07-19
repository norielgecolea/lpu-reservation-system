package org.lpu.dev.codes.services.superadmin;

import java.util.List;

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
import org.lpu.dev.codes.services.JWTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminEquipmentService {

	private static final Logger logger = LogManager.getLogger(SuperAdminEquipmentService.class);

	@Autowired
	private EquipmentRepository equipmentRepository;
	@Autowired
	private FacilityService facServices;

	@Autowired
	private JWTService jwtService;

	@Autowired
	private AdminAuditService auditService;

	public List<PopulateEquipmentList> mappedEquipmentList(List<Equipment> equipment) {

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

	@Transactional
	public PopulateEquipmentResponse getAllEquipment(String token) {

		PopulateEquipmentResponse response = new PopulateEquipmentResponse();

		try {

			if (!jwtService.validateToken(token.replace("LpuL ", ""))) {

				response.setSuccess(false);
				response.setMessage("Unvalidated Session");

				return response;
			}

			if (!"SUPERADMIN".equals(jwtService.getRole(token.replace("LpuL ", "")))) {

				response.setSuccess(false);
				response.setMessage("Unauthorized");

				return response;
			}

			List<Equipment> equipment = equipmentRepository.getAllEquipment();
			
			
			response.setSuccess(true);
			response.setMessage("Get Equipment Success");
			response.setEquipment(mappedEquipmentList(equipment));

			return response;

		} catch (Exception e) {

			logger.error("Failed getting equipment", e);

			response.setSuccess(false);
			response.setMessage("Database Failure");

			return response;
		}
	}

	@Transactional
	public EquipmentResponse toggleEquipmentStatus(Long equipId, String performedBy) {

		EquipmentResponse response = new EquipmentResponse();

		try {

			logger.info("Toggle equipment status request received. Equipment ID: {}", equipId);

			Equipment equipment = equipmentRepository.findById(equipId);

			if (equipment == null) {

				logger.warn("Toggle equipment status failed. User not found. Equipment ID: {}", equipId);

				response.setSuccess(false);
				response.setMessage("Equipment not found");
				return response;
			}

			String oldStatus = equipment.getStatus();
			String newStatus = "AVAILABLE";

			if ("AVAILABLE".equalsIgnoreCase(oldStatus)) {
				newStatus = "UNAVAILABLE";
			}

			boolean updated = equipmentRepository.updateStatus(equipId, newStatus);

			if (updated) {
				logger.info("Equipment status updated successfully. Equipment ID: {}, Old Status: {}, New Status: {}",
						equipId, oldStatus, newStatus);

				auditService.log("EQUIPMENTS", "TOGGLE_STATUS", performedBy, "equipment", equipId,
						equipment.getResource_name(),
						AdminAuditService.detailsOf("previousStatus", oldStatus, "newStatus", newStatus));
			} else {
				logger.warn("Failed to update status. Equipment ID: {}, Requested Status: {}", equipId, newStatus);
			}

			response.setSuccess(updated);
			response.setMessage(
					updated ? "Equipment status changed to " + newStatus : "Failed to update equipment status");

			return response;

		} catch (Exception e) {

			logger.error("Error toggling equipment status. Equipment ID: {}", equipId, e);

			response.setSuccess(false);
			response.setMessage("Failed to update equipment status");

			return response;
		}
	}

	@Transactional
	public EquipmentResponse deleteEquipment(Long equipId, String performedBy) {

		EquipmentResponse response = new EquipmentResponse();

		try {

			logger.info("Delete equipment request received. Equipment ID: {}", equipId);

			Equipment equipment = equipmentRepository.findById(equipId);

			if (equipment == null) {

				logger.warn("Delete equipment failed. Equipment not found. Equipment ID: {}", equipId);

				response.setSuccess(false);
				response.setMessage("Equipment not found");

				return response;
			}

			Boolean deleted = equipmentRepository.deleteById(equipId);
			if (deleted) {
				logger.info("Equipment deleted successfully. Equipment ID: {}, Equipment Name: {}", equipId,
						equipment.getResource_name());

				auditService.log("EQUIPMENTS", "DELETE", performedBy, "equipment", equipId,
						equipment.getResource_name(), null);

				response.setSuccess(true);
				response.setMessage("Equipment deleted successfully");

				return response;
			}

			else {
				response.setSuccess(false);
				response.setMessage("Failed to delete equipment");

				return response;
			}

		} catch (Exception e) {

			logger.error("Error deleting equipment. Equipment ID: {}", equipId, e);

			response.setSuccess(false);
			response.setMessage("Failed to delete equipment");

			return response;
		}
	}

	@Transactional
	public EquipmentResponse createEquipment(CreateEquipmentRequest equipmentForm, String performedBy) {

		EquipmentResponse response = new EquipmentResponse();

		try {

			logger.info("Create equipment request received. Name: {}, Facility ID: {}", equipmentForm.getName(),
					equipmentForm.getId());

			Facility facility = facServices.getFacilitybyId(equipmentForm.getId());

			if (facility == null) {

				logger.warn("Create equipment failed. Facility not found. Facility ID: {}", equipmentForm.getId());

				response.setSuccess(false);
				response.setMessage("Facility not found");

				return response;
			}

			Equipment equipment = new Equipment();
			equipment.setFacility(facility);
			equipment.setName(equipmentForm.getName());
			equipment.setStatus(equipmentForm.getStatus() != null ? equipmentForm.getStatus() : "AVAILABLE");

			equipmentRepository.save(equipment);

			logger.info("Equipment created successfully. Equipment ID: {}, Name: {}, Facility ID: {}",
					equipment.getId(), equipment.getResource_name(), facility.getId());

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

			logger.error("Error creating equipment. Name: {}, Facility ID: {}", equipmentForm.getName(),
					equipmentForm.getId(), e);

			response.setSuccess(false);
			response.setMessage("Failed to create equipment");

			return response;
		}
	}

	@Transactional
	public EquipmentResponse updateEquipment(UpdateEquipmentRequest equipmentForm, String performedBy) {

	    EquipmentResponse response = new EquipmentResponse();

	    try {

	        logger.info(
	                "Update equipment request received. Equipment ID: {}, Facility ID: {}",
	                equipmentForm.getId(),
	                equipmentForm.getFacilityId());

	        Equipment equipment =
	                equipmentRepository.findById(
	                        equipmentForm.getId());

	        if (equipment == null) {

	            logger.warn(
	                    "Update equipment failed. Equipment not found. Equipment ID: {}",
	                    equipmentForm.getId());

	            response.setSuccess(false);
	            response.setMessage("Equipment not found");

	            return response;
	        }

	        Facility facility =
	                facServices.getFacilitybyId(
	                        equipmentForm.getFacilityId());

	        if (facility == null) {

	            logger.warn(
	                    "Update equipment failed. Facility not found. Facility ID: {}",
	                    equipmentForm.getFacilityId());

	            response.setSuccess(false);
	            response.setMessage("Facility not found");

	            return response;
	        }

	        String oldName = equipment.getResource_name();
	        String oldStatus = equipment.getStatus();

	        equipment.setName(equipmentForm.getName());
	        equipment.setStatus(equipmentForm.getStatus());
	        equipment.setFacility(facility);

	        equipmentRepository.save(equipment);

	        logger.info(
	                "Equipment updated successfully. Equipment ID: {}, Old Name: {}, New Name: {}, Old Status: {}, New Status: {}",
	                equipment.getId(),
	                oldName,
	                equipment.getResource_name(),
	                oldStatus,
	                equipment.getStatus());

	        auditService.log("EQUIPMENTS", "UPDATE", performedBy, "equipment", equipment.getId(),
	                equipment.getResource_name(),
	                AdminAuditService.detailsOf(
	                        "previousName", oldName,
	                        "newName", equipment.getResource_name(),
	                        "previousStatus", oldStatus,
	                        "newStatus", equipment.getStatus(),
	                        "facilityId", facility.getId()));

	        response.setSuccess(true);
	        response.setMessage("Equipment updated successfully");

	        return response;

	    } catch (Exception e) {

	        logger.error(
	                "Error updating equipment. Equipment ID: {}",
	                equipmentForm.getId(),
	                e);

	        response.setSuccess(false);
	        response.setMessage("Failed to update equipment");

	        return response;
	    }
	}

}
