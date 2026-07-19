package org.lpu.dev.codes.util;

/** A single reserved or blocked time window on a calendar date. */
public class ReservationSlot {

    private final String date;
    private final int startHour;
    private final int endHour;

    public ReservationSlot(String date, int startHour, int endHour) {
        this.date = date;
        this.startHour = startHour;
        this.endHour = endHour;
    }

    public String getDate() { return date; }
    public int getStartHour() { return startHour; }
    public int getEndHour() { return endHour; }
}
