package org.lpu.dev.codes.model.dto;

import java.util.ArrayList;
import java.util.List;

public class AppRoleDto {
    private String code;
    private String label;
    private boolean system;
    private String homePath;
    private List<String> services = new ArrayList<>();
    private long userCount;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }

    public String getHomePath() { return homePath; }
    public void setHomePath(String homePath) { this.homePath = homePath; }

    public List<String> getServices() { return services; }
    public void setServices(List<String> services) { this.services = services != null ? services : new ArrayList<>(); }

    public long getUserCount() { return userCount; }
    public void setUserCount(long userCount) { this.userCount = userCount; }
}
