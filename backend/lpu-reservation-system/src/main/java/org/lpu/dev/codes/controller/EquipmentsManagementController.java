package org.lpu.dev.codes.controller;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.EquipmentResponse;
import org.lpu.dev.codes.model.apiresponse.PopulateEquipmentResponse;
import org.lpu.dev.codes.model.data.Facility;
import org.lpu.dev.codes.model.dto.CreateEquipmentRequest;
import org.lpu.dev.codes.model.dto.UpdateEquipmentRequest;
import org.lpu.dev.codes.services.AuthenticationService;
import org.lpu.dev.codes.services.FacilityService;
import org.lpu.dev.codes.services.JWTService;
import org.lpu.dev.codes.services.superadmin.SuperAdminEquipmentService;
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
public class EquipmentsManagementController {
	private static final Logger logger = LogManager.getLogger(EquipmentsManagementController.class);
	@Autowired
	public AuthenticationService auth;
	@Autowired
	public SuperAdminEquipmentService superadminEquipment;
	@Autowired
	public FacilityService facility;
	@Autowired
	private JWTService jwtService;

	@GetMapping("/admin/equipment")
	public PopulateEquipmentResponse populateAdminEquipment(@RequestHeader("Authorization") String authHeader) {

		String token = authHeader.replace("LpuL ", "");

		if (!auth.userActive(jwtService.getUsername(token))) {
			PopulateEquipmentResponse res = new PopulateEquipmentResponse();
			logger.error("User not Active! Possible Hacking!");
			res.setSuccess(false);
			res.setMessage("USER NOT ACTIVE!");
			return res;
		}
		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return superadminEquipment.getAllEquipment(token);
		}

		return null;
	}

	@PatchMapping("/admin/toggleequipmentstat")
	public EquipmentResponse toggleEquipmentStatus(@RequestHeader("Authorization") String authHeader,
			@RequestParam("id") Long id) {
		String token = authHeader.replace("LpuL ", "");

		if (!auth.userActive(jwtService.getUsername(token))) {
			EquipmentResponse res = new EquipmentResponse();
			logger.error("User not Active! Possible Hacking!");
			res.setSuccess(false);
			res.setMessage("USER NOT ACTIVE!");
			return res;
		}

		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return superadminEquipment.toggleEquipmentStatus(id, jwtService.getUsername(token));
		}
		return null;
	}

	@DeleteMapping("/admin/deleteequipment")
	public EquipmentResponse deleteEquipment(@RequestHeader("Authorization") String authHeader,
			@RequestParam("id") Long id) {
		String token = authHeader.replace("LpuL ", "");
		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return superadminEquipment.deleteEquipment(id, jwtService.getUsername(token));
		}
		return null;
	}

	@GetMapping("/admin/facility")
	public List<Facility> getAllFacilities(@RequestHeader("Authorization") String authHeader) {
		String token = authHeader.replace("LpuL ", "");
		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return facility.getAllFacility();
		}
		return null;
	}
	
	@PostMapping("/admin/createequipment")
	public EquipmentResponse createEquipment(@RequestHeader("Authorization") String authHeader, @RequestBody CreateEquipmentRequest equipment) {
		String token = authHeader.replace("LpuL ", "");
		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return superadminEquipment.createEquipment(equipment, jwtService.getUsername(token));
		}
		
		
		return null;
	}
	
	@PutMapping("/admin/updateequipment")
	public EquipmentResponse updateEquipment(@RequestHeader("Authorization") String authHeader, @RequestBody UpdateEquipmentRequest equipment) {
		String token = authHeader.replace("LpuL ", "");
		if ("SUPERADMIN".equals(jwtService.getRole(token))) {
			return superadminEquipment.updateEquipment(equipment, jwtService.getUsername(token));
		}
		
		return null;
	}


}
