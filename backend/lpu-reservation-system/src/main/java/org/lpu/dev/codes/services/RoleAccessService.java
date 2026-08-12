package org.lpu.dev.codes.services;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.AppRole;
import org.lpu.dev.codes.model.data.RoleServiceAccess;
import org.lpu.dev.codes.model.dto.AppRoleDto;
import org.lpu.dev.codes.model.dto.CreateAppRoleRequest;
import org.lpu.dev.codes.model.dto.UpdateAppRoleRequest;
import org.lpu.dev.codes.repository.AppRoleRepository;
import org.lpu.dev.codes.repository.RoleServiceAccessRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoleAccessService {

    private static final Logger logger = LogManager.getLogger(RoleAccessService.class);

    public static final String SERVICE_FLT = "FLT";
    public static final String SERVICE_GYMNASIUM = "GYMNASIUM";
    public static final String SERVICE_VAN = "VAN";
    public static final String SERVICE_NEXUS = "NEXUS";

    public static final String ROLE_SUPERADMIN = "SUPERADMIN";
    public static final String ROLE_FACILITIESADMIN = "FACILITIESADMIN";
    public static final String ROLE_FLTTECH = "FLTTECH";
    public static final String ROLE_NEXUSADMIN = "NEXUSADMIN";
    public static final String ROLE_EOADMIN = "EOADMIN";

    private static final Set<String> VALID_SERVICES =
            Set.of(SERVICE_FLT, SERVICE_GYMNASIUM, SERVICE_VAN, SERVICE_NEXUS);
    private static final Set<String> LOCKED_SYSTEM_ROLES = Set.of(ROLE_SUPERADMIN, ROLE_FLTTECH);

    private static final List<String> ALL_SERVICES =
            List.of(SERVICE_FLT, SERVICE_GYMNASIUM, SERVICE_VAN, SERVICE_NEXUS);

    @Autowired private AppRoleRepository appRoleRepository;
    @Autowired private RoleServiceAccessRepository roleServiceAccessRepository;

    @Transactional
    public void ensureDefaults() {
        if (appRoleRepository.count() > 0) {
            return;
        }
        logger.info("Seeding default app_roles and role_service_access");
        upsertRole(ROLE_SUPERADMIN, "Super Admin", true, "/dashboard", ALL_SERVICES);
        upsertRole(ROLE_FACILITIESADMIN, "Facilities Admin", false, "/facilities/dashboard", ALL_SERVICES);
        upsertRole(ROLE_FLTTECH, "FLT Tech", true, "/flt-tech/dashboard", List.of(SERVICE_FLT));
        upsertRole(ROLE_NEXUSADMIN, "Nexus Admin", false, "/facilities/dashboard", List.of(SERVICE_NEXUS));
        upsertRole(ROLE_EOADMIN, "EO Admin", false, "/eo/dashboard", List.of());
    }

    public List<String> getServicesForRole(String role) {
        ensureDefaultsLazy();
        String code = normalizeRole(role);
        if (code.isEmpty()) {
            return List.of();
        }
        if (ROLE_SUPERADMIN.equals(code)) {
            return ALL_SERVICES;
        }
        return List.copyOf(roleServiceAccessRepository.findServiceCodesByRole(code));
    }

    public boolean roleHasService(String role, String serviceCode) {
        String code = normalizeRole(role);
        String service = normalizeService(serviceCode);
        if (code.isEmpty() || service.isEmpty()) {
            return false;
        }
        if (ROLE_SUPERADMIN.equals(code)) {
            return VALID_SERVICES.contains(service);
        }
        return getServicesForRole(code).contains(service);
    }

    public boolean roleHasAnyService(String role) {
        return !getServicesForRole(role).isEmpty();
    }

    public boolean roleExists(String role) {
        ensureDefaultsLazy();
        return appRoleRepository.findByCode(normalizeRole(role)).isPresent();
    }

    public Optional<String> getHomePath(String role) {
        ensureDefaultsLazy();
        return appRoleRepository.findByCode(normalizeRole(role)).map(AppRole::getHomePath);
    }

    public List<AppRoleDto> listRoles() {
        ensureDefaultsLazy();
        List<AppRoleDto> result = new ArrayList<>();
        for (AppRole role : appRoleRepository.findAll()) {
            result.add(toDto(role));
        }
        return result;
    }

    @Transactional
    public AppRoleDto createRole(CreateAppRoleRequest request) {
        ensureDefaultsLazy();
        String code = normalizeRole(request.getCode());
        if (code.isEmpty()) {
            throw new IllegalArgumentException("Role code is required");
        }
        if (!code.matches("^[A-Z][A-Z0-9_]{1,48}$")) {
            throw new IllegalArgumentException("Role code must be uppercase letters, numbers, or underscores");
        }
        if (appRoleRepository.findByCode(code).isPresent()) {
            throw new IllegalArgumentException("Role already exists: " + code);
        }
        String label = request.getLabel() != null ? request.getLabel().trim() : "";
        if (label.isEmpty()) {
            throw new IllegalArgumentException("Role label is required");
        }
        List<String> services = normalizeServices(request.getServices());
        if (services.isEmpty()) {
            throw new IllegalArgumentException("Assign at least one service");
        }

        AppRole role = new AppRole();
        role.setCode(code);
        role.setLabel(label);
        role.setSystem(false);
        role.setHomePath("/facilities/dashboard");
        appRoleRepository.save(role);
        replaceServices(code, services);
        return toDto(role);
    }

    @Transactional
    public AppRoleDto updateRole(String codeRaw, UpdateAppRoleRequest request) {
        ensureDefaultsLazy();
        String code = normalizeRole(codeRaw);
        AppRole role = appRoleRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + code));

        if (request.getLabel() != null && !request.getLabel().isBlank()) {
            role.setLabel(request.getLabel().trim());
        }

        List<String> services = normalizeServices(request.getServices());

        if (ROLE_FLTTECH.equals(code)) {
            // FLT Tech service access is locked
            services = List.of(SERVICE_FLT);
        } else if (ROLE_SUPERADMIN.equals(code)) {
            services = ALL_SERVICES;
        } else if (services.isEmpty() && !ROLE_EOADMIN.equals(code)) {
            throw new IllegalArgumentException("Assign at least one service");
        }

        appRoleRepository.merge(role);
        replaceServices(code, services);
        return toDto(appRoleRepository.findByCode(code).orElse(role));
    }

    @Transactional
    public void deleteRole(String codeRaw) {
        ensureDefaultsLazy();
        String code = normalizeRole(codeRaw);
        AppRole role = appRoleRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + code));
        if (role.isSystem() || LOCKED_SYSTEM_ROLES.contains(code)) {
            throw new IllegalArgumentException("Cannot delete system role: " + code);
        }
        long users = appRoleRepository.countUsersWithRole(code);
        if (users > 0) {
            throw new IllegalArgumentException("Cannot delete role while " + users + " user(s) are assigned");
        }
        roleServiceAccessRepository.deleteByRole(code);
        appRoleRepository.delete(role);
    }

    private void ensureDefaultsLazy() {
        if (appRoleRepository.count() == 0) {
            ensureDefaults();
            return;
        }
        ensureSystemRoleServicesSynced();
    }

    /**
     * Keep locked system mappings current when new services are added
     * (e.g. NEXUS). SUPERADMIN always gets every valid service.
     */
    private void ensureSystemRoleServicesSynced() {
        try {
            Optional<AppRole> superAdmin = appRoleRepository.findByCode(ROLE_SUPERADMIN);
            if (superAdmin.isPresent()) {
                List<String> services = roleServiceAccessRepository.findServiceCodesByRole(ROLE_SUPERADMIN);
                if (!new LinkedHashSet<>(services).containsAll(ALL_SERVICES)) {
                    replaceServices(ROLE_SUPERADMIN, ALL_SERVICES);
                }
            }

            Optional<AppRole> nexusAdmin = appRoleRepository.findByCode(ROLE_NEXUSADMIN);
            if (nexusAdmin.isPresent()) {
                AppRole role = nexusAdmin.get();
                if (role.getHomePath() == null || role.getHomePath().startsWith("/nexus")) {
                    role.setHomePath("/facilities/dashboard");
                    appRoleRepository.merge(role);
                }
                List<String> services = roleServiceAccessRepository.findServiceCodesByRole(ROLE_NEXUSADMIN);
                if (!services.contains(SERVICE_NEXUS)) {
                    RoleServiceAccess access = new RoleServiceAccess();
                    access.setRoleCode(ROLE_NEXUSADMIN);
                    access.setServiceCode(SERVICE_NEXUS);
                    roleServiceAccessRepository.save(access);
                }
            }
            Optional<AppRole> facilities = appRoleRepository.findByCode(ROLE_FACILITIESADMIN);
            if (facilities.isPresent()) {
                List<String> services = roleServiceAccessRepository.findServiceCodesByRole(ROLE_FACILITIESADMIN);
                if (!services.contains(SERVICE_NEXUS)) {
                    RoleServiceAccess access = new RoleServiceAccess();
                    access.setRoleCode(ROLE_FACILITIESADMIN);
                    access.setServiceCode(SERVICE_NEXUS);
                    roleServiceAccessRepository.save(access);
                }
            }
        } catch (Exception e) {
            logger.warn("Could not ensure system role service registration: {}", e.getMessage());
        }
    }

    private void upsertRole(String code, String label, boolean system, String homePath, List<String> services) {
        AppRole role = new AppRole();
        role.setCode(code);
        role.setLabel(label);
        role.setSystem(system);
        role.setHomePath(homePath);
        appRoleRepository.save(role);
        replaceServices(code, services);
    }

    private void replaceServices(String roleCode, List<String> services) {
        roleServiceAccessRepository.deleteByRole(roleCode);
        for (String service : services) {
            RoleServiceAccess access = new RoleServiceAccess();
            access.setRoleCode(roleCode);
            access.setServiceCode(service);
            roleServiceAccessRepository.save(access);
        }
    }

    private AppRoleDto toDto(AppRole role) {
        AppRoleDto dto = new AppRoleDto();
        dto.setCode(role.getCode());
        dto.setLabel(role.getLabel());
        dto.setSystem(role.isSystem());
        dto.setHomePath(role.getHomePath());
        dto.setServices(getServicesForRole(role.getCode()));
        dto.setUserCount(appRoleRepository.countUsersWithRole(role.getCode()));
        return dto;
    }

    private static List<String> normalizeServices(List<String> raw) {
        LinkedHashSet<String> out = new LinkedHashSet<>();
        if (raw == null) {
            return List.of();
        }
        for (String s : raw) {
            String n = normalizeService(s);
            if (VALID_SERVICES.contains(n)) {
                out.add(n);
            }
        }
        return List.copyOf(out);
    }

    public static String normalizeRole(String role) {
        return role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    }

    public static String normalizeService(String service) {
        return service == null ? "" : service.trim().toUpperCase(Locale.ROOT);
    }
}
