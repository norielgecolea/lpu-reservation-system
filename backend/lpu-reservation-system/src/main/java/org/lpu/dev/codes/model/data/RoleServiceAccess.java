package org.lpu.dev.codes.model.data;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "role_service_access")
@IdClass(RoleServiceAccess.Pk.class)
public class RoleServiceAccess {

    @Id
    @Column(name = "role_code", length = 50)
    private String roleCode;

    @Id
    @Column(name = "service_code", length = 20)
    private String serviceCode;

    public String getRoleCode() { return roleCode; }
    public void setRoleCode(String roleCode) { this.roleCode = roleCode; }

    public String getServiceCode() { return serviceCode; }
    public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }

    public static class Pk implements Serializable {
        private String roleCode;
        private String serviceCode;

        public Pk() {}

        public Pk(String roleCode, String serviceCode) {
            this.roleCode = roleCode;
            this.serviceCode = serviceCode;
        }

        public String getRoleCode() { return roleCode; }
        public void setRoleCode(String roleCode) { this.roleCode = roleCode; }

        public String getServiceCode() { return serviceCode; }
        public void setServiceCode(String serviceCode) { this.serviceCode = serviceCode; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Pk pk)) return false;
            return Objects.equals(roleCode, pk.roleCode) && Objects.equals(serviceCode, pk.serviceCode);
        }

        @Override
        public int hashCode() {
            return Objects.hash(roleCode, serviceCode);
        }
    }
}
