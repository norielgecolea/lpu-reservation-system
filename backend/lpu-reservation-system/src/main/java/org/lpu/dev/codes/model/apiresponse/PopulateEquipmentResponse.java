package org.lpu.dev.codes.model.apiresponse;

import java.util.List;

import org.lpu.dev.codes.model.dto.PopulateEquipmentList;

public class PopulateEquipmentResponse {

    private boolean success;
    private String message;
    private List<PopulateEquipmentList> equipment;
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
	public List<PopulateEquipmentList> getEquipment() {
		return equipment;
	}
	public void setEquipment(List<PopulateEquipmentList> equipment) {
		this.equipment = equipment;
	}

    
    
}
