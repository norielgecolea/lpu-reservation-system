package org.lpu.dev.codes.services;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.data.AdminAuditLog;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.model.dto.AdminAuditLogDto;
import org.lpu.dev.codes.repository.AdminAuditLogRepository;
import org.lpu.dev.codes.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AdminAuditService {

    private static final Logger logger = LogManager.getLogger(AdminAuditService.class);
    private static final DateTimeFormatter ISO_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    @Autowired
    private AdminAuditLogRepository auditRepository;

    @Autowired
    private UserRepository userRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void log(
            String service,
            String actionType,
            String adminUsername,
            String targetType,
            Long targetId,
            String targetLabel,
            Map<String, Object> details) {
        if (adminUsername == null || adminUsername.isBlank()) {
            adminUsername = "system";
        }

        AdminAuditLog entry = new AdminAuditLog();
        entry.setService(service);
        entry.setActionType(actionType);
        entry.setAdminUsername(adminUsername);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setTargetLabel(targetLabel);

        Users admin = userRepository.findByUsername(adminUsername);
        if (admin == null) {
            admin = userRepository.findByUsernameIgnoreCase(adminUsername);
        }
        if (admin != null) {
            entry.setAdminFullname(admin.getFullname());
        }

        if (details != null && !details.isEmpty()) {
            try {
                entry.setDetails(objectMapper.writeValueAsString(details));
            } catch (JsonProcessingException e) {
                logger.warn("Failed to serialize audit details for {} {}", service, actionType, e);
            }
        }

        auditRepository.save(entry);
    }

    public void log(
            String service,
            String actionType,
            String adminUsername,
            String targetType,
            Long targetId,
            String targetLabel) {
        log(service, actionType, adminUsername, targetType, targetId, targetLabel, null);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogDto> getLogs(
            String service,
            String actionType,
            String search,
            String fromDate,
            String toDate,
            int page,
            int size) {
        return auditRepository.findByService(service, actionType, search, fromDate, toDate, page, size)
                .stream()
                .map(this::mapRow)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getTotalCount(
            String service,
            String actionType,
            String search,
            String fromDate,
            String toDate) {
        return auditRepository.countByService(service, actionType, search, fromDate, toDate);
    }

    @Transactional(readOnly = true)
    public List<String> getActionTypes(String service) {
        return auditRepository.findDistinctActionTypes(service);
    }

    public static Map<String, Object> detailsOf(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            if (keyValues[i] != null) {
                map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
            }
        }
        return map;
    }

    private AdminAuditLogDto mapRow(Object[] row) {
        AdminAuditLogDto dto = new AdminAuditLogDto();
        dto.setId(((Number) row[0]).longValue());
        dto.setService((String) row[1]);
        dto.setActionType((String) row[2]);
        dto.setAdminUsername((String) row[3]);
        dto.setAdminFullname((String) row[4]);
        dto.setTargetType((String) row[5]);
        if (row[6] != null) {
            dto.setTargetId(((Number) row[6]).longValue());
        }
        dto.setTargetLabel((String) row[7]);
        if (row[8] != null) {
            dto.setDetails(row[8].toString());
        }
        if (row[9] != null) {
            if (row[9] instanceof java.sql.Timestamp ts) {
                dto.setPerformedAt(ts.toLocalDateTime().format(ISO_FORMAT));
            } else if (row[9] instanceof java.time.LocalDateTime ldt) {
                dto.setPerformedAt(ldt.format(ISO_FORMAT));
            } else {
                dto.setPerformedAt(row[9].toString());
            }
        }
        return dto;
    }
}
