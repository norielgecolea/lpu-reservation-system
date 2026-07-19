package org.lpu.dev.codes.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class ReservationSlotUtil {

    private ReservationSlotUtil() {}

    public static List<ReservationSlot> parseReservedDates(String json, ObjectMapper mapper) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            JsonNode array = mapper.readTree(json);
            if (!array.isArray()) return Collections.emptyList();
            List<ReservationSlot> slots = new ArrayList<>();
            for (JsonNode node : array) {
                String date = node.has("date") ? node.get("date").asText(null) : null;
                String start = node.has("startTime") ? node.get("startTime").asText(null) : null;
                String end = node.has("endTime") ? node.get("endTime").asText(null) : null;
                if (date != null && start != null && end != null) {
                    slots.add(new ReservationSlot(date, parseHour(start), parseHour(end)));
                }
            }
            return slots;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public static List<ReservationSlot> parseCoordination(String date, String startTime, String endTime) {
        if (date == null || date.isBlank() || startTime == null || startTime.isBlank() || endTime == null || endTime.isBlank()) {
            return Collections.emptyList();
        }
        return List.of(new ReservationSlot(date, parseHour(startTime), parseHour(endTime)));
    }

    public static boolean slotsOverlap(ReservationSlot a, ReservationSlot b) {
        if (a == null || b == null) return false;
        if (!a.getDate().equals(b.getDate())) return false;
        return a.getStartHour() < b.getEndHour() && a.getEndHour() > b.getStartHour();
    }

    public static boolean anyOverlap(List<ReservationSlot> a, List<ReservationSlot> b) {
        for (ReservationSlot sa : a) {
            for (ReservationSlot sb : b) {
                if (slotsOverlap(sa, sb)) return true;
            }
        }
        return false;
    }

    private static int parseHour(String time) {
        if (time == null || time.isBlank()) return 0;
        String part = time.contains(":") ? time.split(":")[0] : time;
        return Integer.parseInt(part.trim());
    }
}
