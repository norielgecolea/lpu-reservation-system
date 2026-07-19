package org.lpu.dev.codes.model.dto;

public class PopulateEquipmentList {

    private Long id;
    private String resource_name;
    private String status;

    private Long facilityId;
    private String facilityName;
	public Long getId() {
		return id;
	}
	public void setId(Long id) {
		this.id = id;
	}
	public String getName() {
		return resource_name;
	}
	public void setName(String resource_name) {
		this.resource_name = resource_name;
	}
	public String getStatus() {
		return status;
	}
	public void setStatus(String status) {
		this.status = status;
	}
	public Long getFacilityId() {
		return facilityId;
	}
	public void setFacilityId(Long facilityId) {
		this.facilityId = facilityId;
	}
	public String getFacilityName() {
		return facilityName;
	}
	public void setFacilityName(String facilityName) {
		this.facilityName = facilityName;
	}
    
    

}
