package org.lpu.dev.codes.services.superadmin;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.PopulateVehicleResponse;
import org.lpu.dev.codes.model.apiresponse.VehicleResponse;
import org.lpu.dev.codes.model.data.Facility;
import org.lpu.dev.codes.model.data.Vehicle;
import org.lpu.dev.codes.model.dto.CreateVehicleRequest;
import org.lpu.dev.codes.model.dto.PopulateVehicleList;
import org.lpu.dev.codes.model.dto.UpdateVehicleRequest;
import org.lpu.dev.codes.repository.VehicleRepository;
import org.lpu.dev.codes.repository.VanReservationRepository;
import org.lpu.dev.codes.services.AdminAuditService;
import org.lpu.dev.codes.services.FacilityService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.VehicleImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminVehicleService {

	private static final Logger logger = LogManager.getLogger(SuperAdminVehicleService.class);
	@Autowired
	private VehicleImageService imageService;

	@Autowired
	private VehicleRepository vehicleRepository;

	@Autowired
	private VanReservationRepository vanReservationRepository;

	@Autowired
	private FacilityService facServices;

	@Autowired
	private JWTService jwtService;

	@Autowired
	private AdminAuditService auditService;

	public List<PopulateVehicleList> mappedVehicleList(List<Vehicle> vehicles) {

		return vehicles.stream().map(item -> {

			PopulateVehicleList dto = new PopulateVehicleList();

			dto.setId(item.getId());
			dto.setBrand(item.getBrand());
			dto.setPlate_num(item.getPlateNum());
			dto.setCapacity(item.getCapacity());
			dto.setVehicleDescription(item.getVehicleDescription());
			dto.setImageUrl(item.getImageUrl());
			dto.setStatus(item.getStatus());

			dto.setFacilityId(item.getFacility().getId());
			dto.setFacilityName(item.getFacility().getFacilityName());

			return dto;

		}).toList();
	}

	private boolean isVehicleRole(String role) {
		return "SUPERADMIN".equals(role) || "FACILITIESADMIN".equals(role);
	}

	@Transactional
	public PopulateVehicleResponse getAllVehicles(String token) {

		PopulateVehicleResponse response = new PopulateVehicleResponse();

		try {

			if (!jwtService.validateToken(token.replace("LpuL ", ""))) {

				response.setSuccess(false);
				response.setMessage("Unvalidated Session");

				return response;
			}

			if (!isVehicleRole(jwtService.getRole(token.replace("LpuL ", "")))) {

				response.setSuccess(false);
				response.setMessage("Unauthorized");

				return response;
			}

			List<Vehicle> vehicles = vehicleRepository.getAllVehicles();

			response.setSuccess(true);
			response.setMessage("Get Vehicles Success");
			response.setVehicles(mappedVehicleList(vehicles));

			return response;

		} catch (Exception e) {

			logger.error("Failed getting vehicles", e);

			response.setSuccess(false);
			response.setMessage("Database Failure");

			return response;
		}
	}

	@Transactional
	public VehicleResponse toggleVehicleStatus(Long vehicleId, String performedBy) {

		VehicleResponse response = new VehicleResponse();

		try {

			Vehicle vehicle = vehicleRepository.findById(vehicleId);

			if (vehicle == null) {

				response.setSuccess(false);
				response.setMessage("Vehicle not found");

				return response;
			}

			String oldStatus = vehicle.getStatus();

			String newStatus = "AVAILABLE";

			if ("AVAILABLE".equalsIgnoreCase(oldStatus)) {

				newStatus = "UNAVAILABLE";
			}

			boolean updated = vehicleRepository.updateStatus(vehicleId, newStatus);

			if (updated) {
				String label = vehicle.getBrand() + " (" + vehicle.getPlateNum() + ")";
				auditService.log("VEHICLES", "TOGGLE_STATUS", performedBy, "vehicle", vehicleId, label,
						AdminAuditService.detailsOf("previousStatus", oldStatus, "newStatus", newStatus));
			}

			response.setSuccess(updated);
			response.setMessage(updated ? "Vehicle status changed to " + newStatus : "Failed to update vehicle status");

			return response;

		} catch (Exception e) {

			logger.error("Error toggling vehicle status", e);

			response.setSuccess(false);
			response.setMessage("Failed to update vehicle status");

			return response;
		}
	}

	@Transactional
	public VehicleResponse deleteVehicle(Long vehicleId, String performedBy) {

		VehicleResponse response = new VehicleResponse();

		try {

			Vehicle vehicle = vehicleRepository.findById(vehicleId);

			if (vehicle == null) {

				response.setSuccess(false);
				response.setMessage("Vehicle not found");

				return response;
			}

			vanReservationRepository.clearVehicleReferences(vehicleId);

			boolean deleted = vehicleRepository.deleteById(vehicleId);

			if (deleted) {
				String label = vehicle.getBrand() + " (" + vehicle.getPlateNum() + ")";
				auditService.log("VEHICLES", "DELETE", performedBy, "vehicle", vehicleId, label, null);
			}

			response.setSuccess(deleted);
			response.setMessage(deleted ? "Vehicle deleted successfully" : "Failed to delete vehicle");

			return response;

		} catch (Exception e) {

			logger.error("Error deleting vehicle", e);

			response.setSuccess(false);
			response.setMessage("Failed to delete vehicle");

			return response;
		}
	}

	@Transactional
	public VehicleResponse createVehicle(CreateVehicleRequest request, String performedBy) {
		VehicleResponse response = new VehicleResponse();

		try {

			Facility facility = facServices.getFacilitybyId(request.getId());

			if (facility == null) {

				response.setSuccess(false);
				response.setMessage("Facility not found");

				return response;
			}

			Vehicle vehicle = new Vehicle();

			vehicle.setBrand(request.getBrand());

			vehicle.setPlateNum(request.getPlate_num());

			vehicle.setCapacity(request.getCapacity());

			vehicle.setVehicleDescription(request.getVehicleDescription());

			vehicle.setFacility(facility);

			vehicle.setStatus(request.getStatus() != null ? request.getStatus() : "AVAILABLE");

			String image = normalizeImage(request.getImage());

			String imageUrl = imageService.saveImage(image);
			logger.info(imageUrl);
			vehicle.setImageUrl(imageUrl);

			vehicleRepository.save(vehicle);

			String label = vehicle.getBrand() + " (" + vehicle.getPlateNum() + ")";
			auditService.log("VEHICLES", "CREATE", performedBy, "vehicle", vehicle.getId(), label,
					AdminAuditService.detailsOf(
							"brand", vehicle.getBrand(),
							"plateNum", vehicle.getPlateNum(),
							"capacity", vehicle.getCapacity(),
							"status", vehicle.getStatus()));

			response.setSuccess(true);
			response.setMessage("Vehicle created successfully");

			return response;

		} catch (Exception e) {

			logger.error("Error creating vehicle", e);

			response.setSuccess(false);
			response.setMessage("Failed to create vehicle");

			return response;
		}
	}

	@Transactional
	public VehicleResponse updateVehicle(UpdateVehicleRequest request, String performedBy) {

		VehicleResponse response = new VehicleResponse();

		try {

			Vehicle vehicle = vehicleRepository.findById(request.getId());

			if (vehicle == null) {

				response.setSuccess(false);
				response.setMessage("Vehicle not found");

				return response;
			}

			Facility facility = facServices.getFacilitybyId(request.getFacilityId());

			if (facility == null) {

				response.setSuccess(false);
				response.setMessage("Facility not found");

				return response;
			}

			vehicle.setBrand(request.getBrand());

			vehicle.setPlateNum(request.getPlate_num());

			vehicle.setCapacity(request.getCapacity());

			vehicle.setVehicleDescription(request.getVehicleDescription());

			vehicle.setStatus(request.getStatus());

			vehicle.setFacility(facility);

			if (request.getImage() != null && !request.getImage().trim().isEmpty()) {
				String image = normalizeImage(request.getImage());
				String imageUrl = imageService.saveImage(image);
				logger.info(imageUrl);
				vehicle.setImageUrl(imageUrl);
			}

			vehicleRepository.save(vehicle);

			String label = vehicle.getBrand() + " (" + vehicle.getPlateNum() + ")";
			auditService.log("VEHICLES", "UPDATE", performedBy, "vehicle", vehicle.getId(), label,
					AdminAuditService.detailsOf(
							"brand", vehicle.getBrand(),
							"plateNum", vehicle.getPlateNum(),
							"capacity", vehicle.getCapacity(),
							"status", vehicle.getStatus()));

			response.setSuccess(true);
			response.setMessage("Vehicle updated successfully");

			return response;

		} catch (Exception e) {

			logger.error("Error updating vehicle", e);

			response.setSuccess(false);
			response.setMessage("Failed to update vehicle");

			return response;
		}
	}

	private String normalizeImage(String image) {
		if (image == null || image.isBlank()) {
			return null;
		}

		return image.trim();
	}
}
