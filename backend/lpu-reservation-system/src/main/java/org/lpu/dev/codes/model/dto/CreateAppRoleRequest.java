package org.lpu.dev.codes.model.dto;

import java.util.ArrayList;
import java.util.List;

public class CreateAppRoleRequest {
    private String code;
    private String label;
    private List<String> services = new ArrayList<>();

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public List<String> getServices() { return services; }
    public void setServices(List<String> services) { this.services = services != null ? services : new ArrayList<>(); }
}
