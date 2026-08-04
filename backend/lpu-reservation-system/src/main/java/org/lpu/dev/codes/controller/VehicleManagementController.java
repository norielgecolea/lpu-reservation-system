package org.lpu.dev.codes.controller;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.PopulateVehicleResponse;
import org.lpu.dev.codes.model.apiresponse.VehicleResponse;
import org.lpu.dev.codes.model.dto.CreateVehicleRequest;
import org.lpu.dev.codes.model.dto.UpdateVehicleRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.superadmin.SuperAdminVehicleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/")
@CrossOrigin("*")
public class VehicleManagementController {

	private static final Logger logger = LogManager.getLogger(VehicleManagementController.class);

	@Autowired
	private AuthenticationService auth;
	@Autowired
	private SuperAdminVehicleService superAdminVehicle;
	
	@Autowired
	private JWTService jwtService;

	@Autowired
	private org.lpu.dev.codes.services.RoleAccessService roleAccessService;

	private boolean isAllowed(String token) {
		String role = jwtService.getRole(token);
		return roleAccessService.roleHasAnyService(role)
				&& !"FLTTECH".equalsIgnoreCase(role);
	}

	@GetMapping("/admin/vehicle")
	public PopulateVehicleResponse populateAdminVehicles(@RequestHeader("Authorization") String authHeader) {

		String token = authHeader.replace("LpuL ", "");

		if (!auth.userActive(jwtService.getUsername(token))) {

			PopulateVehicleResponse res = new PopulateVehicleResponse();

			logger.error("User not Active! Possible Hacking!");

			res.setSuccess(false);
			res.setMessage("USER NOT ACTIVE!");

			return res;
		}

		if (isAllowed(token)) {

			return superAdminVehicle.getAllVehicles(token);
		}

		PopulateVehicleResponse res = new PopulateVehicleResponse();
		res.setSuccess(false);
		res.setMessage("Unauthorized");
		return res;
	}

	@PatchMapping("/admin/togglevehiclestat")
	public VehicleResponse toggleVehicleStatus(@RequestHeader("Authorization") String authHeader,
			@RequestParam("id") Long id) {

		String token = authHeader.replace("LpuL ", "");

		if (!auth.userActive(jwtService.getUsername(token))) {

			VehicleResponse res = new VehicleResponse();

			logger.error("User not Active! Possible Hacking!");

			res.setSuccess(false);
			res.setMessage("USER NOT ACTIVE!");

			return res;
		}

		if (isAllowed(token)) {

			return superAdminVehicle.toggleVehicleStatus(id, jwtService.getUsername(token));
		}

		VehicleResponse res = new VehicleResponse();
		res.setSuccess(false);
		res.setMessage("Unauthorized");
		return res;
	}

	@DeleteMapping("/admin/deletevehicle")
	public VehicleResponse deleteVehicle(@RequestHeader("Authorization") String authHeader,
			@RequestParam("id") Long id) {

		String token = authHeader.replace("LpuL ", "");

		if (isAllowed(token)) {

			return superAdminVehicle.deleteVehicle(id, jwtService.getUsername(token));
		}

		VehicleResponse res = new VehicleResponse();
		res.setSuccess(false);
		res.setMessage("Unauthorized");
		return res;
	}

	@PostMapping("/admin/createvehicle")
	public VehicleResponse createVehicle(@RequestHeader("Authorization") String authHeader,
			@RequestBody CreateVehicleRequest vehicle) {
		String token = authHeader.replace("LpuL ", "");
		if (!isAllowed(token)) {
			VehicleResponse res = new VehicleResponse();
			res.setSuccess(false);
			res.setMessage("Unauthorized");
			return res;
		}
		try {
			return superAdminVehicle.createVehicle(vehicle, jwtService.getUsername(token));
		} catch (Exception e) {
			logger.error("Vehicle creation failed", e);
			VehicleResponse res = new VehicleResponse();
			res.setSuccess(false);
			res.setMessage("Failed to create vehicle");
			return res;
		}
	}

	@PutMapping("/admin/updatevehicle")
	public VehicleResponse updateVehicle(@RequestHeader("Authorization") String authHeader,
			@RequestBody UpdateVehicleRequest vehicle) {

		String token = authHeader.replace("LpuL ", "");

		if (isAllowed(token)) {
			return superAdminVehicle.updateVehicle(vehicle, jwtService.getUsername(token));
		}
		VehicleResponse res = new VehicleResponse();
		res.setSuccess(false);
		res.setMessage("Unauthorized");
		return res;
	}
}