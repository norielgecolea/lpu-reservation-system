package org.lpu.dev.codes.services;

import java.time.LocalDateTime;
import java.util.List;

import org.lpu.dev.codes.model.dto.ReservationWsEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReservationEventPublisher {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishCreated(String facility, Long reservationId) {
        ReservationWsEvent event = baseEvent("CREATED", reservationId, "PENDING");
        messagingTemplate.convertAndSend(topic(facility), event);
    }

    public void publishStatusUpdate(String facility, Long reservationId, String status, List<Long> conflictedIds) {
        publishStatusUpdate(facility, reservationId, status, conflictedIds, List.of());
    }

    public void publishStatusUpdate(String facility, Long reservationId, String status,
            List<Long> conflictedIds, List<Long> revertedIds) {
        ReservationWsEvent event = baseEvent("STATUS_UPDATED", reservationId, status);
        if (conflictedIds != null) {
            event.setConflictedIds(conflictedIds);
        }
        if (revertedIds != null) {
            event.setRevertedIds(revertedIds);
        }
        messagingTemplate.convertAndSend(topic(facility), event);
    }

    private ReservationWsEvent baseEvent(String type, Long reservationId, String status) {
        ReservationWsEvent event = new ReservationWsEvent();
        event.setType(type);
        event.setReservationId(reservationId);
        event.setStatus(status);
        event.setTimestamp(LocalDateTime.now().toString());
        return event;
    }

    private String topic(String facility) {
        return "/topic/reservations/" + facility;
    }
}
