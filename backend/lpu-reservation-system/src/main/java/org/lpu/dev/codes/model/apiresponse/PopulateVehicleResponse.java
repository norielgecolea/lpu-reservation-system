package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.PopulateVehicleList;

public class PopulateVehicleResponse {
	private boolean success;
	private String message;
	private List<PopulateVehicleList> vehicles;
	public boolean isSuccess() {
		return success;
	}
	public void setSuccess(boolean success) {
		this.success = success;
	}
	public String getMessage() {
		return message;
	}
	public void setMessage(String message) {
		this.message = message;
	}
	public List<PopulateVehicleList> getVehicles() {
		return vehicles;
	}
	public void setVehicles(List<PopulateVehicleList> vehicles) {
		this.vehicles = vehicles;
	}

	
}
