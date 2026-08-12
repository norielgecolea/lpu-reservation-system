import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui';
import { FltStepper } from './flt-stepper';
import { FltReservationService } from './flt-reservation.service';
import { ExternalEventNoticeStep } from '../../../shared/components/external-event-notice-step';
import { FltApprovedEvent, FltEquipmentItem, ReservedDateSlot, TIME_SLOTS } from './flt-reservation.models';
import { MaintenanceBlock, MaintenanceService } from '../../admin/maintenance/maintenance.service';
import {
  RESERVATION_ADVANCE_DAYS,
  advanceNoticeText,
  getMinBookableDateStr,
} from '../reservation-advance.util';
import { formatReadableTime } from '../../../shared/utils/datetime.util';

type View = 'calendar' | 'timeslots' | 'notice' | 'form';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_PER_WEEK = 7;

interface CalendarPlot {
  kind: 'EVENT' | 'COORDINATION' | 'MAINTENANCE';
  startTime: string;
  endTime: string;
  label: string;
  title: string;
  trackKey: string;
}

interface CalendarCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  isPast: boolean;
  plots: CalendarPlot[];
}

@Component({
  selector: 'app-flt-reservation',
  imports: [RouterLink, UiIcon, FltStepper, ExternalEventNoticeStep],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-0 flex-col',
  },
  template: `
    <!-- ─── VIEW 1: Full-screen Calendar ─── -->
    @if (view() === 'calendar') {
      <div
        class="flex min-h-0 flex-col"
        [class.min-h-screen]="!adminMode()"
        [class.flex-1]="adminMode()"
        [class.h-full]="adminMode()"
      >

        <!-- Header -->
        <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
          <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div class="flex items-center gap-3 flex-1">
              @if (!adminMode()) {
                <img src="/logo.svg" alt="LPU Logo" width="40" height="40" class="w-10 h-10 shrink-0 object-contain drop-shadow" />
              }
              <div>
                <h1 class="text-xl sm:text-2xl font-black tracking-tight leading-tight">FLT Theater</h1>
                @if (!adminMode()) {
                  <p class="text-white/60 text-xs">Feliciano L. Torres Theater</p>
                }
              </div>
            </div>
            <div class="flex items-center gap-3">
              <!-- Month navigator -->
              <div class="flex items-center gap-1 bg-white/10 rounded-xl p-1">
                <button
                  type="button"
                  (click)="prevMonth()"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ui-icon name="chevron_left" class="text-xl" />
                </button>
                <span class="px-3 text-sm font-bold min-w-32 text-center">{{ monthLabel() }}</span>
                <button
                  type="button"
                  (click)="nextMonth()"
                  class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                >
                  <ui-icon name="chevron_right" class="text-xl" />
                </button>
              </div>
              <a
                [routerLink]="returnPath()"
                class="inline-flex shrink-0 items-center gap-1.5 cursor-pointer transition"
                [class.rounded-lg]="adminMode()"
                [class.bg-white]="adminMode()"
                [class.px-3]="adminMode()"
                [class.py-1.5]="adminMode()"
                [class.text-sm]="adminMode()"
                [class.font-semibold]="adminMode()"
                [class.text-primary]="adminMode()"
                [class.shadow-sm]="adminMode()"
                [class.hover:bg-white/90]="adminMode()"
                [class.text-xs]="!adminMode()"
                [class.text-white/70]="!adminMode()"
                [class.hover:text-white]="!adminMode()"
              >
                <ui-icon name="arrow_back" class="text-base" />
                {{ adminMode() ? 'Back to list' : 'Back' }}
              </a>
            </div>
          </div>
        </div>

        <!-- Calendar grid -->
        <div
          class="select-none flex min-h-0 flex-1 flex-col max-w-screen-2xl w-full mx-auto px-4 sm:px-6 py-4 gap-3"
        >
          @if (loadingEvents()) {
            <div
              class="flex items-center justify-center gap-3 text-gray-400"
              [class.flex-1]="true"
              [class.py-20]="!adminMode()"
            >
              <ui-icon name="autorenew" class="text-3xl animate-spin" />
              <span class="text-sm">Loading schedule...</span>
            </div>
          } @else {
            <div
              class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl ring-1 ring-black/5 shadow-sm bg-white"
            >
              <!-- Day-of-week header -->
              <div class="grid grid-cols-7 bg-primary text-center text-sm font-bold text-white shrink-0">
                @for (wd of weekdays; track wd) {
                  <div class="border-r border-white/30 px-1 py-2.5 last:border-r-0 text-xs sm:text-sm">{{ wd }}</div>
                }
              </div>
              <!-- Day cells -->
              <div
                class="min-h-0 flex-1 grid grid-cols-7 overflow-hidden"
                [style.grid-template-rows]="calendarRows()"
              >
                @for (cell of calendarCells(); track cell.dateStr ?? ('pad-' + $index)) {
                  <div
                    class="flex h-full min-h-0 flex-col overflow-hidden border-r border-b border-gray-100 bg-white p-1 sm:p-1.5 transition-colors"
                    [class.bg-gray-50]="cell.day !== null && !cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                    [class.bg-gray-100]="cell.day === null"
                    [class.bg-primary/5]="cell.isToday"
                    [class.bg-emerald-50]="cell.day !== null && !cell.isToday && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                    [class.ring-2]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                    [class.ring-inset]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                    [class.ring-emerald-500]="cell.day !== null && !cell.isPast && basket().some(s => s.date === cell.dateStr)"
                    [class.cursor-pointer]="cell.day !== null && !cell.isPast"
                    [class.hover:bg-sky-50]="cell.day !== null && !cell.isPast && !cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                    [class.opacity-40]="cell.isPast"
                    (click)="cell.day !== null && !cell.isPast ? selectDay(cell.dateStr!) : null"
                  >
                    @if (cell.day !== null) {
                      <span
                        class="mx-auto mb-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs font-semibold"
                        [class.bg-primary]="cell.isToday"
                        [class.text-white]="cell.isToday"
                        [class.bg-emerald-500]="!cell.isToday && basket().some(s => s.date === cell.dateStr)"
                        [class.text-white]="!cell.isToday && basket().some(s => s.date === cell.dateStr)"
                        [class.text-gray-700]="!cell.isToday && !basket().some(s => s.date === cell.dateStr)"
                      >{{ cell.day }}</span>
                      @if (cell.plots.length > 0) {
                        <ul class="mt-0.5 min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain" style="scrollbar-width: thin">
                          @for (plot of cell.plots; track plot.trackKey) {
                            <li
                              class="min-w-0 truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight font-semibold"
                              [class.border-sky-500]="plot.kind === 'EVENT'"
                              [class.bg-sky-50]="plot.kind === 'EVENT'"
                              [class.text-sky-800]="plot.kind === 'EVENT'"
                              [class.border-amber-500]="plot.kind === 'COORDINATION'"
                              [class.bg-amber-50]="plot.kind === 'COORDINATION'"
                              [class.text-amber-800]="plot.kind === 'COORDINATION'"
                              [class.border-orange-500]="plot.kind === 'MAINTENANCE'"
                              [class.bg-orange-50]="plot.kind === 'MAINTENANCE'"
                              [class.text-orange-800]="plot.kind === 'MAINTENANCE'"
                              [title]="formatTimeShort(plot.startTime) + '–' + formatTimeShort(plot.endTime) + ' · ' + plot.title"
                            >{{ formatTimeShort(plot.startTime) }}–{{ formatTimeShort(plot.endTime) }} · {{ plot.label }}</li>
                          }
                        </ul>
                      }
                      @if (basket().some(s => s.date === cell.dateStr)) {
                        <div class="mt-auto pt-0.5">
                          <span class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 leading-none">
                            ✓ Selected
                          </span>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap items-center gap-2 shrink-0 text-xs text-gray-500">
              <span class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded border-l-2 border-sky-500 bg-sky-50"></span>
                Approved Reservation
              </span>
              <span class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded border-l-2 border-amber-500 bg-amber-50"></span>
                Coordination Meeting
              </span>
              <span class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                Your Selection
              </span>
              <span class="flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded border-l-2 border-orange-500 bg-orange-50"></span>
                Maintenance
              </span>
              <span class="ml-2 flex items-center gap-1.5">
                <span class="inline-block w-3 h-3 rounded-full bg-primary"></span>
                Today
              </span>
              @if (advanceNotice()) {
                <span class="ml-auto text-[11px] italic text-amber-600 flex items-center gap-1">
                  <ui-icon name="info" class="text-xs" />
                  {{ advanceNotice() }}
                </span>
              }
              @if (adminMode()) {
                <span class="ml-auto text-[11px] font-semibold text-emerald-200 flex items-center gap-1">
                  <ui-icon name="admin_panel_settings" class="text-xs" />
                  Admin booking — advance rule waived
                </span>
              }
            </div>
          }
        </div>

        <!-- Basket bar (bottom) -->
        @if (basket().length > 0) {
          <div class="shrink-0 border-t border-gray-200 bg-white shadow-lg px-4 sm:px-6 py-3">
            <div class="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1 flex flex-wrap gap-2">
                @for (slot of basket(); track slot.date) {
                  <div class="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                    <ui-icon name="event" class="text-sm" />
                    {{ formatDateShort(slot.date) }} {{ formatTimeShort(slot.startTime) }}–{{ formatTimeShort(slot.endTime) }}
                    <button type="button" (click)="removeFromBasket(slot.date)" class="ml-1 hover:text-red-500 cursor-pointer transition-colors">
                      <ui-icon name="close" class="text-sm" />
                    </button>
                  </div>
                }
              </div>
              <button
                type="button"
                (click)="goToForm()"
                class="shrink-0 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
              >
                Continue to Form
                <ui-icon name="arrow_forward" class="text-base" />
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- ─── VIEW 2: Day Time Slots ─── -->
    @if (view() === 'timeslots') {
      <div
        class="select-none flex min-h-0 flex-col"
        [class.h-dvh]="!adminMode()"
        [class.flex-1]="adminMode()"
        [class.h-full]="adminMode()"
      >

        <!-- Header -->
        <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
          <div
            class="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center gap-2 sm:gap-4"
            [class.py-3]="adminMode()"
            [class.py-4]="!adminMode()"
          >
            <button
              type="button"
              (click)="view.set('calendar')"
              class="flex shrink-0 items-center gap-1 text-white/70 hover:text-white transition-colors cursor-pointer text-sm"
            >
              <ui-icon name="arrow_back" class="text-xl" />
              <span class="hidden sm:inline">Calendar</span>
            </button>
            <div class="flex-1 min-w-0 text-center">
              <h2 class="text-base sm:text-xl font-black tracking-tight truncate">{{ formatDateLong(selectedDay()) }}</h2>
              <p class="text-white/60 text-xs hidden sm:block">FLT Theater — Select start and end time</p>
            </div>
            @if (adminMode()) {
              <a
                [routerLink]="returnPath()"
                title="Back to list"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90 cursor-pointer"
              >
                <ui-icon name="arrow_back" class="text-base" />
                Back to list
              </a>
            } @else {
              <div class="w-24"></div>
            }
          </div>
        </div>

        <!-- Time slots -->
        <div
          class="max-w-screen-md mx-auto w-full px-4 sm:px-6 flex min-h-0 flex-1 flex-col pt-3 sm:pt-6"
        >
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3" style="scrollbar-width: thin">
          <div
            class="rounded-xl ring-1 ring-black/5 shadow-sm bg-white overflow-hidden"
          >
            @for (slot of timeSlots; track slot.value) {
              @if (getMaintenanceSlot(slot.value); as mb) {
                <!-- Under Maintenance slot -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 bg-orange-50 flex items-center gap-2">
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-bold text-orange-700 truncate">🔧 {{ mb.reason || 'Under Maintenance' }}</p>
                      <p class="text-[10px] text-orange-500">{{ formatTimeShort(mb.startTime) }} – {{ formatTimeShort(mb.endTime) }} · Not Available</p>
                    </div>
                    <ui-icon name="construction" class="text-sm shrink-0 text-orange-400" />
                  </div>
                </div>
              } @else if (getSlotEvent(slot.value); as ev) {
                <!-- Booked slot -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div
                    class="flex-1 px-3 py-2.5 flex items-center gap-2"
                    [class.bg-sky-50]="ev.eventKind !== 'COORDINATION'"
                    [class.bg-amber-50]="ev.eventKind === 'COORDINATION'"
                  >
                    <div class="flex-1 min-w-0">
                      <p
                        class="text-xs font-bold truncate"
                        [class.text-sky-700]="ev.eventKind !== 'COORDINATION'"
                        [class.text-amber-700]="ev.eventKind === 'COORDINATION'"
                      >{{ ev.eventKind === 'COORDINATION' ? '📋 Coordination Meeting' : ev.department }}</p>
                      <p
                        class="text-[10px]"
                        [class.text-sky-500]="ev.eventKind !== 'COORDINATION'"
                        [class.text-amber-500]="ev.eventKind === 'COORDINATION'"
                      >{{ formatTimeShort(ev.startTime) }} – {{ formatTimeShort(ev.endTime) }} · {{ ev.eventKind === 'COORDINATION' ? 'Blocked' : 'Reserved' }}</p>
                    </div>
                    <ui-icon
                      [name]="ev.eventKind === 'COORDINATION' ? 'handshake' : 'lock'"
                      class="text-sm shrink-0"
                      [class.text-sky-400]="ev.eventKind !== 'COORDINATION'"
                      [class.text-amber-400]="ev.eventKind === 'COORDINATION'"
                    />
                  </div>
                </div>
              } @else if (isSlotInBasket(slot.value)) {
                <!-- Already in basket -->
                <div class="flex items-stretch border-b border-gray-100 last:border-b-0">
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 bg-primary/5 flex items-center gap-2">
                    <ui-icon name="check_circle" class="text-primary text-base shrink-0" />
                    <span class="text-xs font-semibold text-primary">Your selection</span>
                  </div>
                </div>
              } @else {
                <!-- Available slot -->
                <div
                  class="flex items-stretch border-b border-gray-100 last:border-b-0 cursor-pointer group"
                  [class.ring-2]="isSlotSelected(slot.value)"
                  [class.ring-primary]="isSlotSelected(slot.value)"
                  [class.bg-primary/5]="isSlotSelected(slot.value)"
                  (click)="toggleTimeSlot(slot.value)"
                >
                  <div class="w-20 sm:w-24 shrink-0 flex items-center justify-end pr-3 py-3 text-xs font-semibold text-gray-400 border-r border-gray-100">
                    {{ slot.label }}
                  </div>
                  <div class="flex-1 px-3 py-2.5 flex items-center gap-2 group-hover:bg-emerald-50 transition-colors">
                    @if (isSlotSelected(slot.value)) {
                      <ui-icon name="check" class="text-primary text-base shrink-0" />
                      <span class="text-xs font-semibold text-primary">Selected</span>
                    } @else {
                      <span class="text-xs text-gray-400 group-hover:text-emerald-600 transition-colors">Available — click to select</span>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <!-- Time selection error -->
          @if (timeSlotError()) {
            <p class="mt-3 text-sm text-red-500 flex items-center gap-1.5">
              <ui-icon name="warning" class="text-base" />
              {{ timeSlotError() }}
            </p>
          }

          </div>
        </div>

        <div
          class="shrink-0 border-t border-gray-200 bg-white shadow-lg px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div class="max-w-screen-md mx-auto flex flex-col gap-3">
            <!-- Add Date button -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                (click)="view.set('calendar')"
                class="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ui-icon name="arrow_back" class="text-base" />
                Back to Calendar
              </button>
              <button
                type="button"
                (click)="addToBasket()"
                [disabled]="selectedTimeStart() === null || selectedTimeEnd() === null"
                class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <ui-icon name="add" class="text-base" />
                Add This Date
              </button>
            </div>

            @if (basket().length > 0) {
              <div>
                <p class="text-xs font-semibold text-gray-500 mb-2">Selected dates:</p>
                <div class="flex flex-wrap gap-2 mb-3">
                  @for (s of basket(); track s.date) {
                    <div class="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary">
                      {{ formatDateShort(s.date) }} {{ formatTimeShort(s.startTime) }}–{{ formatTimeShort(s.endTime) }}
                      <button type="button" (click)="removeFromBasket(s.date)" class="ml-1 hover:text-red-500 cursor-pointer transition-colors">
                        <ui-icon name="close" class="text-sm" />
                      </button>
                    </div>
                  }
                </div>
                <button
                  type="button"
                  (click)="goToForm()"
                  class="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
                >
                  Continue to Form
                  <ui-icon name="arrow_forward" class="text-base" />
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ─── VIEW 3: External event notice ─── -->
    @if (view() === 'notice') {
      <app-external-event-notice-step
        facilityTitle="FLT Theater"
        (back)="view.set('calendar')"
        (continued)="proceedToForm()"
      />
    }

    <!-- ─── VIEW 4: Stepper Form ─── -->
    @if (view() === 'form') {
      <div
        class="flex min-h-0 flex-col"
        [class.min-h-screen]="!adminMode()"
        [class.md:h-screen]="!adminMode()"
        [class.md:min-h-0]="!adminMode()"
        [class.flex-1]="adminMode()"
        [class.h-full]="adminMode()"
      >
        <!-- Thin maroon top bar -->
        <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shrink-0 px-4 sm:px-6 py-3 flex items-center gap-4 shadow">
          @if (!adminMode()) {
            <img src="/logo.svg" alt="LPU Logo" width="32" height="32" loading="lazy" class="w-8 h-8 object-contain drop-shadow" />
          }
          <span class="font-bold text-sm tracking-wide">FLT Theater — Reservation Form</span>
          <div class="ml-auto flex items-center gap-3">
            @if (!adminMode()) {
              <button
                type="button"
                (click)="view.set('calendar')"
                class="flex items-center gap-1.5 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
              >
                <ui-icon name="calendar_month" class="text-base" />
                Change Dates
              </button>
            }
            @if (adminMode()) {
              <a
                [routerLink]="returnPath()"
                class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90 cursor-pointer"
              >
                <ui-icon name="arrow_back" class="text-base" />
                Back to list
              </a>
            }
          </div>
        </div>
        <div
          class="flex min-h-0 flex-1 flex-col overflow-y-auto"
          style="scrollbar-width: thin"
        >
          @if (equipmentLoading()) {
            <div
              class="flex items-center justify-center gap-3 text-gray-400"
              [class.flex-1]="!adminMode()"
              [class.py-20]="adminMode()"
            >
              <ui-icon name="autorenew" class="text-3xl animate-spin" />
            </div>
          } @else {
            <app-flt-stepper
              [adminMode]="adminMode()"
              [selectedDates]="basket()"
              [availableEquipment]="availableEquipment()"
              [equipmentLoading]="equipmentLoading()"
              [returnPath]="returnPath()"
              [returnLabel]="adminMode() ? 'Back to list' : 'Back to Home'"
              (addMoreDates)="view.set('calendar')"
            />
          }
        </div>
      </div>
    }
  `,
})
export class FltReservation implements OnInit {
  private readonly service = inject(FltReservationService);
  private readonly maintSvc = inject(MaintenanceService);

  readonly adminMode = input(false);
  readonly returnPath = input('/customer');

  @HostBinding('class.min-h-screen') get fullHeight(): boolean {
    return !this.adminMode();
  }

  @HostBinding('class.h-full') get adminFillHeight(): boolean {
    return this.adminMode();
  }

  @HostBinding('class.min-h-0') get adminMinH0(): boolean {
    return this.adminMode();
  }

  @HostBinding('class.flex-1') get adminFlex1(): boolean {
    return this.adminMode();
  }

  @HostBinding('class.flex') get adminFlex(): boolean {
    return this.adminMode();
  }

  @HostBinding('class.flex-col') get adminFlexCol(): boolean {
    return this.adminMode();
  }

  @HostBinding('class.bg-gray-50') get lightBg(): boolean {
    return true;
  }

  readonly advanceDays = computed(() =>
    this.adminMode() ? 0 : RESERVATION_ADVANCE_DAYS.FLT,
  );

  readonly advanceNotice = computed(() =>
    advanceNoticeText(this.advanceDays()),
  );

  readonly view = signal<View>('calendar');
  readonly loadingEvents = signal(true);
  readonly equipmentLoading = signal(true);

  readonly approvedEvents = signal<FltApprovedEvent[]>([]);
  readonly availableEquipment = signal<FltEquipmentItem[]>([]);
  readonly basket = signal<ReservedDateSlot[]>([]);
  readonly maintenanceBlocks = signal<MaintenanceBlock[]>([]);

  readonly activeYear = signal(new Date().getFullYear());
  readonly activeMonth = signal(new Date().getMonth()); // 0-indexed

  readonly selectedDay = signal<string | null>(null);
  readonly selectedTimeStart = signal<number | null>(null);
  readonly selectedTimeEnd = signal<number | null>(null);
  readonly timeSlotError = signal('');

  readonly weekdays = WEEKDAYS;
  readonly timeSlots = TIME_SLOTS;

  readonly monthLabel = computed(() => {
    const d = new Date(this.activeYear(), this.activeMonth(), 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  readonly calendarCells = computed<CalendarCell[]>(() => {
    const year = this.activeYear();
    const month = this.activeMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.formatDate(today);
    const minBookableStr = getMinBookableDateStr(this.advanceDays(), today);

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rowCount = Math.max(5, Math.ceil((firstWeekday + daysInMonth) / 7));
    const cellCount = rowCount * 7;
    const events = this.approvedEvents();
    const maintenance = this.maintenanceBlocks();

    return Array.from({ length: cellCount }, (_, i) => {
      const dayOffset = i - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInMonth) {
        return { day: null, dateStr: null, isToday: false, isPast: false, plots: [] };
      }
      const day = dayOffset + 1;
      const dateStr = this.formatDate(new Date(year, month, day));
      // "isPast" here means not bookable — includes today through today+13
      const isPast = dateStr < minBookableStr;
      const plots: CalendarPlot[] = [
        ...events
          .filter((e) => e.date === dateStr)
          .map((e) => {
            const isCoord = e.eventKind === 'COORDINATION';
            const label = isCoord ? 'Coordination' : e.department;
            return {
              kind: (isCoord ? 'COORDINATION' : 'EVENT') as CalendarPlot['kind'],
              startTime: e.startTime,
              endTime: e.endTime,
              label,
              title: label,
              trackKey: `ev-${e.eventTitle}-${e.startTime}-${e.endTime}-${e.eventKind ?? 'RESERVATION'}`,
            };
          }),
        ...maintenance
          .filter((b) => b.blockDate === dateStr)
          .map((b) => ({
            kind: 'MAINTENANCE' as const,
            startTime: b.startTime,
            endTime: b.endTime,
            label: 'Maint',
            title: b.reason || 'Maintenance',
            trackKey: `mb-${b.id}`,
          })),
      ].sort((a, b) => {
        const byStart = (a.startTime || '').localeCompare(b.startTime || '');
        if (byStart !== 0) return byStart;
        return (a.endTime || '').localeCompare(b.endTime || '');
      });
      return {
        day,
        dateStr,
        isToday: dateStr === todayStr,
        isPast,
        plots,
      };
    });
  });

  readonly calendarRows = computed(() => {
    const rows = this.calendarCells().length / 7;
    return `repeat(${rows}, minmax(4.75rem, 1fr))`;
  });

  ngOnInit(): void {
    this.service.getApprovedEvents().subscribe({
      next: (res) => {
        if (res.success) this.approvedEvents.set(res.approvedEvents ?? []);
        this.loadingEvents.set(false);
      },
      error: () => this.loadingEvents.set(false),
    });

    this.service.getEquipment().subscribe({
      next: (res) => {
        if (res.success) this.availableEquipment.set(res.equipment ?? []);
        this.equipmentLoading.set(false);
      },
      error: () => this.equipmentLoading.set(false),
    });

    this.maintSvc.getPublicBlocks('FLT').subscribe({
      next: (res) => { if (res.success) this.maintenanceBlocks.set(res.blocks ?? []); },
      error: () => {},
    });
  }

  prevMonth(): void {
    if (this.activeMonth() === 0) {
      this.activeMonth.set(11);
      this.activeYear.update(y => y - 1);
    } else {
      this.activeMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.activeMonth() === 11) {
      this.activeMonth.set(0);
      this.activeYear.update(y => y + 1);
    } else {
      this.activeMonth.update(m => m + 1);
    }
  }

  selectDay(dateStr: string): void {
    this.selectedDay.set(dateStr);
    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.timeSlotError.set('');
    this.view.set('timeslots');
  }

  /** Returns the approved event that occupies a given hour on the selected day, or null */
  getSlotEvent(hourStr: string): FltApprovedEvent | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this.approvedEvents().find(ev => {
      if (ev.date !== day) return false;
      const start = parseInt(ev.startTime, 10);
      const end = parseInt(ev.endTime, 10);
      // Inclusive of end clock time so 08:00–12:00 highlights through 12:00
      return hour >= start && hour <= end;
    }) ?? null;
  }

  /** Returns the maintenance block that occupies a given hour on the selected day, or null */
  getMaintenanceSlot(hourStr: string): MaintenanceBlock | null {
    const day = this.selectedDay();
    if (!day) return null;
    const hour = parseInt(hourStr, 10);
    return this.maintenanceBlocks().find(b => {
      if (b.blockDate !== day) return false;
      const start = parseInt(b.startTime, 10);
      const end = parseInt(b.endTime, 10);
      // Inclusive of end clock time so 08:00–12:00 highlights through 12:00
      return hour >= start && hour <= end;
    }) ?? null;
  }

  isSlotSelected(hourStr: string): boolean {
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (start === null) return false;
    if (end === null) return hour === start;
    // Inclusive of end clock time so clicking 6:00 PM highlights that row
    return hour >= start && hour <= end;
  }

  isSlotInBasket(hourStr: string): boolean {
    const day = this.selectedDay();
    if (!day) return false;
    return this.basket().some(s => {
      if (s.date !== day) return false;
      const hour = parseInt(hourStr, 10);
      const start = parseInt(s.startTime, 10);
      const end = parseInt(s.endTime, 10);
      return hour >= start && hour <= end;
    });
  }

  toggleTimeSlot(hourStr: string): void {
    this.timeSlotError.set('');
    const hour = parseInt(hourStr, 10);
    const start = this.selectedTimeStart();

    if (start === null) {
      this.selectedTimeStart.set(hour);
      this.selectedTimeEnd.set(null);
      return;
    }

    // Second click: set end clock time (same slot = 1-hour booking)
    const lo = Math.min(start, hour);
    const hi = start === hour ? hour + 1 : Math.max(start, hour);

    // Check that no booked slot falls in [lo, hi)
    const day = this.selectedDay()!;
    const hasConflict = this.approvedEvents().some(ev => {
      if (ev.date !== day) return false;
      const evStart = parseInt(ev.startTime, 10);
      const evEnd = parseInt(ev.endTime, 10);
      return evStart < hi && evEnd > lo;
    });

    if (hasConflict) {
      this.timeSlotError.set('Your selection crosses a reserved slot. Please choose a different range.');
      this.selectedTimeStart.set(hour);
      this.selectedTimeEnd.set(null);
      return;
    }

    this.selectedTimeStart.set(lo);
    this.selectedTimeEnd.set(hi);
  }

  addToBasket(): void {
    const day = this.selectedDay();
    const start = this.selectedTimeStart();
    const end = this.selectedTimeEnd();
    if (!day || start === null || end === null) return;

    const startStr = `${String(start).padStart(2, '0')}:00`;
    const endStr = `${String(end).padStart(2, '0')}:00`;

    this.basket.update(b => {
      const without = b.filter(s => s.date !== day);
      return [...without, { date: day, startTime: startStr, endTime: endStr }].sort((a, b) => a.date.localeCompare(b.date));
    });

    this.selectedTimeStart.set(null);
    this.selectedTimeEnd.set(null);
    this.timeSlotError.set('');
    this.view.set('calendar');
  }

  removeFromBasket(date: string): void {
    this.basket.update(b => b.filter(s => s.date !== date));
  }

  goToForm(): void {
    if (this.adminMode()) {
      this.view.set('form');
      return;
    }
    this.view.set('notice');
  }

  proceedToForm(): void {
    this.view.set('form');
  }

  formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDateShort(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDateLong(dateStr: string | null): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatTimeShort(timeStr: string): string {
    return formatReadableTime(timeStr);
  }
}
