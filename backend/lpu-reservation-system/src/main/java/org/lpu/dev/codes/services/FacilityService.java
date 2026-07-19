package org.lpu.dev.codes.services;

import java.util.List;

import org.lpu.dev.codes.model.data.Facility;
import org.lpu.dev.codes.repository.FacilityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FacilityService {
	@Autowired
	private FacilityRepository facRepo;

	@Transactional
	public List<Facility> getAllFacility() {
		
		
		return facRepo.getAllFacilities();
	}

	public Facility getFacilitybyId(Long id) {
		return facRepo.findById(id);
	}
}
