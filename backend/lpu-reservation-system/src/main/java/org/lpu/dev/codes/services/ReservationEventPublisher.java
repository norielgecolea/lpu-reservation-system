package org.lpu.dev.codes.services;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.dto.ReservationWsEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class ReservationEventPublisher {

    private static final Logger logger = LogManager.getLogger(ReservationEventPublisher.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void publishCreated(String facility, Long reservationId) {
        runAfterCommit(() -> {
            ReservationWsEvent event = baseEvent("CREATED", reservationId, "PENDING");
            messagingTemplate.convertAndSend(topic(facility), event);
            logger.info("Published CREATED for {} reservation {}", facility, reservationId);
        });
    }

    public void publishStatusUpdate(String facility, Long reservationId, String status, List<Long> conflictedIds) {
        publishStatusUpdate(facility, reservationId, status, conflictedIds, List.of());
    }

    public void publishStatusUpdate(String facility, Long reservationId, String status,
            List<Long> conflictedIds, List<Long> revertedIds) {
        runAfterCommit(() -> {
            ReservationWsEvent event = baseEvent("STATUS_UPDATED", reservationId, status);
            if (conflictedIds != null) {
                event.setConflictedIds(conflictedIds);
            }
            if (revertedIds != null) {
                event.setRevertedIds(revertedIds);
            }
            messagingTemplate.convertAndSend(topic(facility), event);
            logger.info("Published STATUS_UPDATED {} for {} reservation {}", status, facility, reservationId);
        });
    }

    /**
     * Defer broker publish until the surrounding DB transaction commits so subscribers
     * that immediately re-fetch do not race an uncommitted insert/update.
     */
    private void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
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
