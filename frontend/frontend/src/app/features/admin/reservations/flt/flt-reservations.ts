import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FltRescheduleCalendar, RescheduleEvent } from './flt-reschedule-calendar';
import { CoordinationSlot, FltCoordinationCalendar } from './flt-coordination-calendar';
import { UiButton, UiIcon, UiInputSearch, UiSelect, UiSelectOption, UiToast, UiDateSelector } from '../../../../shared/ui';
import { getCurrentYearMonth, reservationRecordToSummaryEvent, vanRecordsToDashboardRecords } from '../../dashboard/dashboard-events.util';
import { formatReadableDateTime, formatTime12 } from '../../../../shared/utils/datetime.util';
import { DashboardEventSummaryModal } from '../../dashboard/dashboard-event-summary-modal';
import { parseStatusFilterParam, reservationMatchesStatusFilter } from '../reservation-filter.util';
import {
  FltReservationRecord,
  RequestedEquipmentItem,
  ReservationStatus,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './flt-reservations.models';
import { FltReservationsService } from './flt-reservations.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { isFltTech } from '../../../../core/auth/roles';
import { ReservationRealtimeService, ReservationWsEvent } from '../reservation-realtime.service';
import { ReservationAlertService } from '../reservation-alert.service';
import { applyRevertedIds, applyReservationWsEvent } from '../reservation-ws.util';
import { MaintenanceBlock, MaintenanceService } from '../../../admin/maintenance/maintenance.service';
import { countUpcomingMaintenanceBlocks } from '../../../admin/maintenance/maintenance.util';
import { MaintenanceCalendarPicker, MaintenanceSlot, ScheduledEvent } from '../../../admin/maintenance/maintenance-calendar-picker';
import { ReservationExportModal } from '../reservation-export-modal';
import { exportFltReservationsCsv, ExportDateRange } from '../reservation-export.util';
import { adminAddReservationPath } from '../admin-reservation-path.util';
import { ApprovedReservationActionsMenu } from '../approved-reservation-actions-menu';
import { ReservationApproverTableSkeleton } from '../reservation-approver-table-skeleton';
import { ReservationApproverMobileSkeleton } from '../reservation-approver-mobile-skeleton';

const STATUS_FILTERS = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
const FLT_TECH_STATUS_FILTERS = ['All', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface ConfirmState {
  id: number;
  action: ReservationStatus;
  eventTitle: string;
}

@Component({
  selector: 'app-flt-reservations',
  imports: [ RouterLink, UiButton, UiIcon, UiInputSearch, UiSelect, UiToast, UiDateSelector, FltRescheduleCalendar, FltCoordinationCalendar, MaintenanceCalendarPicker, ReservationExportModal, ApprovedReservationActionsMenu, ReservationApproverTableSkeleton, ReservationApproverMobileSkeleton, DashboardEventSummaryModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-none flex-col gap-4 md:min-h-0 md:flex-1' },
  template: `
    <!-- Header -->
      <section class="animate-rise flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-black text-gray-900">FLT Theater Reservations</h1>
          <p class="text-sm text-gray-500 mt-0.5">Review and manage all FLT reservation requests</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          @if (!isFltTechRole()) {
            <a uiButton [routerLink]="addReservationPath">
              <ui-icon name="add" class="text-base" />
              <span class="hidden sm:inline">Add Reservation</span>
            </a>
          }
          <button type="button" (click)="exportOpen.set(true)"
            class="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <ui-icon name="download" class="text-base" />
            <span class="hidden sm:inline">Export</span>
          </button>
          <button type="button" (click)="openMaintenance()"
            class="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer">
            <ui-icon name="construction" class="text-base" />
            <span class="hidden sm:inline">Maintenance</span>
            @if (upcomingMaintenanceCount() > 0) {
              <span class="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white w-4 h-4 text-[9px] font-black">{{ upcomingMaintenanceCount() }}</span>
            }
          </button>
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <ui-icon name="event_note" class="text-primary text-base" />
            <span>{{ filtered().length }} of {{ reservations().length }} shown</span>
          </div>
        </div>
      </section>

      <!-- Filters -->
      <section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ui-select
          class="w-full sm:w-44 shrink-0"
          [value]="statusFilter()"
          (valueChange)="statusFilter.set($any($event))"
          placeholder="Filter by status"
          [options]="statusFilterOptions"
        />
        <ui-date-selector [value]="activeMonth()" (valueChange)="onMonthChange($event)" />
        <ui-input-search
          placeholder="Search by event, department, contact..."
          (valueChange)="search.set($event)"
          class="w-full sm:min-w-48 sm:flex-1 min-w-0"
        />
      </section>

      <!-- Table -->
      <section class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] animate-rise flex flex-col rounded-xl max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
        @if (apiError()) {
          <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <ui-icon name="cloud_off" class="text-5xl text-red-300" />
            <p class="text-sm font-semibold text-red-500">Failed to load reservations</p>
            <p class="text-xs text-gray-400 max-w-xs">The server could not be reached or returned an error. Make sure the backend is running and your session is valid.</p>
            <button
              type="button"
              (click)="load()"
              class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer mt-1"
            >
              <ui-icon name="refresh" class="text-base" />
              Retry
            </button>
          </div>
        } @else if (!loading() && filtered().length === 0) {
          <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <ui-icon name="event_busy" class="text-5xl text-gray-300" />
            <p class="text-sm font-semibold text-gray-500">No reservations found</p>
            <p class="text-xs text-gray-400">Try adjusting your search or filter</p>
          </div>
        } @else {
          @if (loading()) {
            <app-reservation-approver-mobile-skeleton />
          } @else {
            <div class="md:hidden flex flex-col gap-3 p-3">
              @for (row of filtered(); track row.id) {
                <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div class="cursor-pointer" (click)="openDetails(row)">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <p class="text-xs text-gray-400 font-mono">#{{ row.id }}</p>
                        <p class="font-semibold text-gray-900">{{ row.eventTitle }}</p>
                        <p class="text-xs text-gray-500 capitalize">{{ row.eventType }}</p>
                      </div>
                      <span
                        class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                        [class.bg-amber-100]="row.status === 'PENDING'"
                        [class.text-amber-700]="row.status === 'PENDING'"
                        [class.bg-emerald-100]="row.status === 'APPROVED'"
                        [class.text-emerald-700]="row.status === 'APPROVED'"
                        [class.bg-red-100]="row.status === 'REJECTED'"
                        [class.text-red-700]="row.status === 'REJECTED'"
                        [class.bg-gray-100]="row.status === 'CANCELLED'"
                        [class.text-gray-500]="row.status === 'CANCELLED'"
                        [class.bg-teal-100]="row.status === 'COMPLETED'"
                        [class.text-teal-700]="row.status === 'COMPLETED'"
                        [class.bg-orange-100]="row.status === 'CONFLICT'"
                        [class.text-orange-700]="row.status === 'CONFLICT'"
                      >{{ row.status }}</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-2 truncate">{{ row.department }} · {{ row.organization }}</p>
                    <p class="text-[11px] text-gray-400 mt-1">{{ formatDate(row.createdAt) }}</p>
                    @if (row.additionalInstructions) {
                      <p class="mt-1 text-[10px] italic text-amber-600 truncate" [title]="row.additionalInstructions">
                        📝 {{ row.additionalInstructions }}
                      </p>
                    }
                    @if (row.status === 'PENDING' && hasApprovedOverlap(row)) {
                      <p class="mt-1 text-[10px] font-semibold text-orange-600">⚠ Conflict schedule</p>
                    }
                    @if (row.status === 'COMPLETED' && row.satisfactionRating) {
                      <div class="flex items-center gap-0.5 mt-1.5" [title]="row.satisfactionRating + ' / 5'">
                        @for (star of [1,2,3,4,5]; track star) {
                          <span class="text-sm" [class.text-yellow-400]="star <= row.satisfactionRating!" [class.text-gray-300]="star > row.satisfactionRating!">★</span>
                        }
                      </div>
                    }
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    @if (!isFltTechRole() && row.status === 'PENDING') {
                      <button
                        type="button"
                        (click)="requestConfirm(row, 'APPROVED')"
                        [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ui-icon name="check_circle" class="text-sm" />
                        <span class="hidden sm:inline">Approve</span>
                      </button>
                      <button
                        type="button"
                        (click)="requestConfirm(row, 'REJECTED')"
                        [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ui-icon name="cancel" class="text-sm" />
                        <span class="hidden sm:inline">Reject</span>
                      </button>
                    } @else if (!isFltTechRole() && row.status === 'CONFLICT') {
                      <button
                        type="button"
                        (click)="requestConfirm(row, 'REJECTED')"
                        [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ui-icon name="cancel" class="text-sm" />
                        <span class="hidden sm:inline">Reject</span>
                      </button>
                    } @else if (row.status === 'APPROVED') {
                      <app-approved-reservation-actions-menu
                        [rowId]="row.id"
                        [expanded]="isApprovedActionsExpanded(row.id)"
                        (expandedChange)="setApprovedActionsExpanded(row.id, $event)"
                        [disabled]="acting() === row.id"
                      >
                        <button
                          type="button"
                          (click)="openCoordination(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          [title]="row.coordinationDate ? 'Update coordination: ' + row.coordinationDate : 'Set coordination meeting'"
                        >
                          <ui-icon name="handshake" class="text-sm" />
                          {{ row.coordinationDate ? 'Coordination ✓' : 'Coordination' }}
                        </button>
                        <button
                          type="button"
                          (click)="openReschedule(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="edit_calendar" class="text-sm" />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'COMPLETED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="task_alt" class="text-sm" />
                          Complete
                        </button>
                        @if (row.coordinationDate && row.coordinationStartTime && row.coordinationEndTime) {
                          <button
                            type="button"
                            (click)="downloadReservationForm(row)"
                            [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download reservation form"
                          >
                            <ui-icon name="download" class="text-sm" />
                            Download
                          </button>
                        }
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'CANCELLED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="block" class="text-sm" />
                          Cancel
                        </button>
                      </app-approved-reservation-actions-menu>
                    }
                  </div>
                </div>
              }
            </div>
          }
          <div class="hidden md:block min-h-0 flex-1 overflow-auto">
            <table class="w-full text-sm border-collapse bg-white">
              <thead class="sticky top-0 z-10">
                <tr class="border-b border-gray-100 bg-gray-50">
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 w-10">#</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Event</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden md:table-cell">Dept / Org</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Contact</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden xl:table-cell">Dates</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Room / Pax</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden xl:table-cell">Equipment</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Status</th>
                  <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  <app-reservation-approver-table-skeleton />
                } @else {
                  @for (row of filtered(); track row.id) {
                <tr class="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">{{ row.id }}</td>

                  <!-- Event -->
                  <td class="px-4 py-3 max-w-[200px] cursor-pointer hover:bg-gray-50/80 transition-colors" (click)="openDetails(row)">
                    <p class="font-semibold text-gray-900 truncate">{{ row.eventTitle }}</p>
                    <p class="text-xs text-gray-500 capitalize">{{ row.eventType }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDate(row.createdAt) }}</p>
                    @if (row.additionalInstructions) {
                      <p class="mt-1 text-[10px] italic text-amber-600 truncate max-w-[180px]" [title]="row.additionalInstructions">
                        📝 {{ row.additionalInstructions }}
                      </p>
                    }
                    <p class="mt-1 text-[10px] font-semibold text-primary">Click to view full summary</p>
                  </td>

                  <!-- Dept / Org -->
                  <td class="px-4 py-3 hidden md:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.department }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.organization }}</p>
                  </td>

                  <!-- Contact -->
                  <td class="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.contactPerson }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.contactEmail }}</p>
                    <p class="text-xs text-gray-400">{{ row.contactNumber }}</p>
                  </td>

                  <!-- Dates -->
                  <td class="px-4 py-3 hidden xl:table-cell max-w-[180px]">
                    @for (slot of parseDates(row.reservedDates); track slot.date) {
                      <div class="text-[11px] leading-tight text-gray-600 flex items-center gap-1 mb-0.5">
                        <ui-icon name="calendar_today" class="text-[10px] text-primary shrink-0" />
                        <span>{{ slot.date }}</span>
                        <span class="text-gray-400">{{ formatSlotTime(slot.startTime, slot.endTime) }}</span>
                      </div>
                    }
                  </td>

                  <!-- Room / Pax -->
                  <td class="px-4 py-3 hidden lg:table-cell max-w-[130px]">
                    <p class="text-xs font-medium text-gray-700">{{ row.roomType ? getRoomTypeLabel(row.roomType) : '—' }}</p>
                    @if (row.expectedAttendees) {
                      <p class="text-xs text-gray-400">{{ row.expectedAttendees }} pax</p>
                    }
                  </td>

                  <!-- Equipment -->
                  <td class="px-4 py-3 hidden xl:table-cell max-w-[140px]">
                    @if (parseEquipment(row.requestedEquipment).length > 0) {
                      @for (eq of parseEquipment(row.requestedEquipment); track eq.id) {
                        <div class="text-[11px] text-gray-600 flex items-center gap-1 mb-0.5">
                          <ui-icon name="devices" class="text-[10px] shrink-0" />
                          {{ eq.name }}
                        </div>
                      }
                    } @else {
                      <span class="text-xs text-gray-400 italic">None</span>
                    }
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                      [class.bg-amber-100]="row.status === 'PENDING'"
                      [class.text-amber-700]="row.status === 'PENDING'"
                      [class.bg-emerald-100]="row.status === 'APPROVED'"
                      [class.text-emerald-700]="row.status === 'APPROVED'"
                      [class.bg-red-100]="row.status === 'REJECTED'"
                      [class.text-red-700]="row.status === 'REJECTED'"
                      [class.bg-gray-100]="row.status === 'CANCELLED'"
                      [class.text-gray-500]="row.status === 'CANCELLED'"
                      [class.bg-teal-100]="row.status === 'COMPLETED'"
                      [class.text-teal-700]="row.status === 'COMPLETED'"
                      [class.bg-orange-100]="row.status === 'CONFLICT'"
                      [class.text-orange-700]="row.status === 'CONFLICT'"
                    >{{ row.status }}</span>
                    @if (row.status === 'PENDING' && hasApprovedOverlap(row)) {
                      <p class="mt-1 text-[10px] font-semibold text-orange-600">⚠ Conflict schedule</p>
                    }
                    @if (row.status === 'COMPLETED' && row.satisfactionRating) {
                      <div class="flex items-center gap-0.5 mt-1.5" [title]="row.satisfactionRating + ' / 5'">
                        @for (star of [1,2,3,4,5]; track star) {
                          <span class="text-sm" [class.text-yellow-400]="star <= row.satisfactionRating!" [class.text-gray-300]="star > row.satisfactionRating!">★</span>
                        }
                      </div>
                    }
                  </td>

                  <!-- Actions -->
                  <td class="px-4 py-3 text-right">
                    @if (!isFltTechRole() && row.status === 'PENDING') {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'APPROVED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="check_circle" class="text-sm" />
                          <span class="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'REJECTED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="cancel" class="text-sm" />
                          <span class="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    } @else if (!isFltTechRole() && row.status === 'CONFLICT') {
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'REJECTED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="cancel" class="text-sm" />
                          <span class="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    } @else if (row.status === 'APPROVED') {
                      <app-approved-reservation-actions-menu
                        [rowId]="row.id"
                        [expanded]="isApprovedActionsExpanded(row.id)"
                        (expandedChange)="setApprovedActionsExpanded(row.id, $event)"
                        [disabled]="acting() === row.id"
                      >
                        <button
                          type="button"
                          (click)="openCoordination(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          [title]="row.coordinationDate ? 'Update coordination: ' + row.coordinationDate : 'Set coordination meeting'"
                        >
                          <ui-icon name="handshake" class="text-sm" />
                          {{ row.coordinationDate ? 'Coordination ✓' : 'Coordination' }}
                        </button>
                        <button
                          type="button"
                          (click)="openReschedule(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="edit_calendar" class="text-sm" />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'COMPLETED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="task_alt" class="text-sm" />
                          Complete
                        </button>
                        @if (row.coordinationDate && row.coordinationStartTime && row.coordinationEndTime) {
                          <button
                            type="button"
                            (click)="downloadReservationForm(row)"
                            [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download reservation form"
                          >
                            <ui-icon name="download" class="text-sm" />
                            Download
                          </button>
                        }
                        <button
                          type="button"
                          (click)="requestConfirm(row, 'CANCELLED')"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="block" class="text-sm" />
                          Cancel
                        </button>
                      </app-approved-reservation-actions-menu>
                    } @else {
                      <span class="text-xs text-gray-300 italic">—</span>
                    }
                  </td>
                </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </section>

      @if (detailsSummaryEvent(); as event) {
        <app-dashboard-event-summary-modal [event]="event" (closed)="closeDetails()" />
      }

      <!-- Confirmation Dialog -->
      @if (confirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="confirm.set(null)">
          <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4" (click)="$event.stopPropagation()">
            <div class="flex items-start gap-3">
              @if (confirm()!.action === 'APPROVED') {
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <ui-icon name="check_circle" class="text-emerald-600 text-xl" />
                </div>
              } @else if (confirm()!.action === 'REJECTED') {
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <ui-icon name="cancel" class="text-red-600 text-xl" />
                </div>
              } @else if (confirm()!.action === 'COMPLETED') {
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100">
                  <ui-icon name="task_alt" class="text-teal-600 text-xl" />
                </div>
              } @else {
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <ui-icon name="block" class="text-gray-600 text-xl" />
                </div>
              }
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-bold text-gray-900">
                  {{ actionLabel(confirm()!.action) }} Reservation
                </h2>
                <p class="text-xs text-gray-500 mt-1">
                  Are you sure you want to mark the reservation for
                  <strong>"{{ confirm()!.eventTitle }}"</strong> as <strong class="lowercase">{{ confirm()!.action.toLowerCase() }}</strong>? This cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <button
                type="button"
                (click)="confirm.set(null)"
                class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="executeAction()"
                [disabled]="acting() !== null"
                class="rounded-lg px-4 py-2 text-sm font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [class.bg-emerald-600]="confirm()!.action === 'APPROVED'"
                [class.hover:bg-emerald-700]="confirm()!.action === 'APPROVED'"
                [class.bg-red-600]="confirm()!.action === 'REJECTED'"
                [class.hover:bg-red-700]="confirm()!.action === 'REJECTED'"
                [class.bg-teal-600]="confirm()!.action === 'COMPLETED'"
                [class.hover:bg-teal-700]="confirm()!.action === 'COMPLETED'"
                [class.bg-gray-600]="confirm()!.action === 'CANCELLED'"
                [class.hover:bg-gray-700]="confirm()!.action === 'CANCELLED'"
              >
                @if (acting() !== null) {
                  <ui-icon name="autorenew" class="text-base animate-spin" />
                } @else {
                  Confirm
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Toast -->
      <ui-toast [message]="toast()" (dismissed)="toast.set('')" />

    @if (exportOpen()) {
      <app-reservation-export-modal
        serviceName="FLT"
        (closed)="exportOpen.set(false)"
        (exported)="runExport($event)"
      />
    }
    <!-- ─── Coordination Calendar Overlay ─── -->
    @if (coordinationTarget()) {
      <app-flt-coordination-calendar
        [events]="coordinationCalendarEvents()"
        [eventTitle]="coordinationTarget()!.eventTitle"
        [saving]="coordSaving"
        [initial]="coordinationInitialSlot()"
        (saved)="saveCoordination($event)"
        (cancelled)="closeCoordination()"
      />
    }

    <!-- ─── Reschedule Calendar Overlay ─── (outside admin-shell so it covers full viewport) -->
    @if (rescheduleTarget()) {
      <app-flt-reschedule-calendar
        [events]="rescheduleApprovedEvents()"
        [initialSlots]="rescheduleInitialSlots()"
        [eventTitle]="rescheduleTarget()!.eventTitle"
        [saving]="rescheduleSaving"
        (saved)="saveReschedule($event)"
        (cancelled)="closeReschedule()"
      />
    }

    <!-- ─── Maintenance Calendar Overlay ─── -->
    @if (showMaintenance()) {
      <app-maintenance-calendar-picker
        facilityLabel="FLT Theater"
        [existingBlocks]="maintenanceBlocks()"
        [events]="maintenanceEvents()"
        [saving]="maintSaving"
        (addSlot)="addMaintenanceBlock($event)"
        (removeSlot)="removeMaintenanceBlock($event)"
        (cancelled)="closeMaintenance()"
      />
    }
  `,
})
export class FltReservations implements OnInit, OnDestroy {
  private readonly svc  = inject(FltReservationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly maintSvc = inject(MaintenanceService);
  private readonly realtime = inject(ReservationRealtimeService);
  private readonly alerts = inject(ReservationAlertService);
  private readonly auth = inject(AuthService);

  protected readonly isFltTechRole = computed(() => isFltTech(this.auth.user()?.role));

  protected readonly addReservationPath = adminAddReservationPath('flt', this.router.url);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  readonly loading = signal(true);
  readonly apiError = signal(false);
  readonly reservations = signal<FltReservationRecord[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>(
    isFltTech(this.auth.user()?.role) ? 'APPROVED' : 'PENDING',
  );
  readonly activeMonth = signal(getCurrentYearMonth());
  readonly acting = signal<number | null>(null);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly detailsTarget = signal<FltReservationRecord | null>(null);

  protected readonly detailsSummaryEvent = computed(() => {
    const row = this.detailsTarget();
    return row ? reservationRecordToSummaryEvent(row, 'FLT') : null;
  });
  readonly toast = signal('');
  readonly exportOpen = signal(false);
  readonly expandedApprovedActions = signal<Set<number>>(new Set());

  protected isApprovedActionsExpanded(id: number): boolean {
    return this.expandedApprovedActions().has(id);
  }

  protected setApprovedActionsExpanded(id: number, expanded: boolean): void {
    this.expandedApprovedActions.update(set => {
      const next = new Set(set);
      if (expanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  // Maintenance
  readonly showMaintenance = signal(false);
  readonly maintenanceBlocks = signal<MaintenanceBlock[]>([]);
  readonly upcomingMaintenanceCount = computed(() =>
    countUpcomingMaintenanceBlocks(this.maintenanceBlocks()),
  );
  readonly maintSaving = signal(false);

  /** Approved events to show in the maintenance calendar (read-only context) */
  readonly maintenanceEvents = computed<ScheduledEvent[]>(() =>
    this.reservations()
      .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
      .flatMap((r): ScheduledEvent[] => {
        const events: ScheduledEvent[] = [];
        try {
          const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
          for (const s of slots) {
            events.push({ date: s.date, startTime: s.startTime, endTime: s.endTime, department: r.department, organization: r.organization, eventKind: 'RESERVATION' });
          }
        } catch { /* skip */ }
        if (r.coordinationDate && r.coordinationStartTime && r.coordinationEndTime) {
          events.push({ date: r.coordinationDate, startTime: r.coordinationStartTime, endTime: r.coordinationEndTime, department: r.department, organization: r.organization, eventKind: 'COORDINATION' });
        }
        return events;
      })
  );

  // Coordination modal
  readonly coordinationTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly coordSaving = signal(false);

  // Reschedule calendar overlay
  readonly rescheduleTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly rescheduleSaving = signal(false);

  /** Events to show on the reschedule calendar — all approved reservations/coordination EXCEPT the one being rescheduled */
  readonly rescheduleApprovedEvents = computed<RescheduleEvent[]>(() => {
    const target = this.rescheduleTarget();
    const events: RescheduleEvent[] = [];
    for (const r of this.reservations()) {
      if (r.status !== 'APPROVED' && r.status !== 'COMPLETED') continue;
      if (r.id === target?.id) continue; // skip self
      try {
        const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
        for (const s of slots) {
          events.push({ date: s.date, startTime: s.startTime, endTime: s.endTime, department: r.department, organization: r.organization, eventKind: 'RESERVATION' });
        }
      } catch { /* ignore */ }
      if (r.coordinationDate && r.coordinationStartTime && r.coordinationEndTime) {
        events.push({ date: r.coordinationDate, startTime: r.coordinationStartTime, endTime: r.coordinationEndTime, department: r.department, organization: r.organization, eventKind: 'COORDINATION' });
      }
    }
    return events;
  });

  /** Pre-populate the calendar basket with the current reservation's slots */
  readonly rescheduleInitialSlots = computed<ReservedDateSlot[]>(() => {
    const target = this.rescheduleTarget();
    if (!target) return [];
    const row = this.reservations().find(r => r.id === target.id);
    if (!row) return [];
    try { return JSON.parse(row.reservedDates); } catch { return []; }
  });

  /** Events shown inside the coordination calendar (exclude the coordination meeting of the target reservation) */
  readonly coordinationCalendarEvents = computed<RescheduleEvent[]>(() => {
    const target = this.coordinationTarget();
    return this.reservations().flatMap((r): RescheduleEvent[] => {
      const isTarget = !!target && r.id === target.id;
      if (!isTarget && r.status !== 'APPROVED' && r.status !== 'COMPLETED') return [];
      const events: RescheduleEvent[] = [];
      try {
        const slots: Array<{ date: string; startTime: string; endTime: string }> = JSON.parse(r.reservedDates);
        for (const s of slots) {
          events.push({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            department: r.department,
            organization: r.organization,
            eventTitle: r.eventTitle,
            eventKind: isTarget ? 'TARGET' : 'RESERVATION',
          });
        }
      } catch { /* skip */ }
      if (r.coordinationDate && r.coordinationStartTime && r.coordinationEndTime && !isTarget) {
        events.push({
          date: r.coordinationDate,
          startTime: r.coordinationStartTime,
          endTime: r.coordinationEndTime,
          department: r.department,
          organization: r.organization,
          eventTitle: r.eventTitle,
          eventKind: 'COORDINATION',
        });
      }
      return events;
    });
  });

  /** Pre-populate coordination calendar with existing coordination slot */
  readonly coordinationInitialSlot = computed<CoordinationSlot | null>(() => {
    const target = this.coordinationTarget();
    if (!target) return null;
    const row = this.reservations().find(r => r.id === target.id);
    if (!row?.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) return null;
    return { date: row.coordinationDate, startTime: row.coordinationStartTime, endTime: row.coordinationEndTime };
  });

  readonly statusFilterOptions: UiSelectOption[] = (
    isFltTech(this.auth.user()?.role) ? FLT_TECH_STATUS_FILTERS : STATUS_FILTERS
  ).map((s) => ({ value: s, label: s }));

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const status = this.statusFilter();
    const rows = this.reservations().filter(r => {
      if (this.isFltTechRole() && (r.status === 'PENDING' || r.status === 'CONFLICT')) {
        return false;
      }
      const matchStatus = reservationMatchesStatusFilter(status, r.status);
      const matchSearch =
        !q ||
        r.eventTitle.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.organization.toLowerCase().includes(q) ||
        r.contactPerson.toLowerCase().includes(q) ||
        r.contactEmail.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    return [...rows].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  });

  ngOnInit(): void {
    this.applyDashboardQueryParams();
    this.load();
    this.loadMaintenance();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.fltUpdates$.subscribe(ev => this.handleWsEvent(ev));
    this.pollSub = this.realtime.refreshTicks$.subscribe(() => this.load({ quiet: true }));
  }

  private applyDashboardQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const allowed = this.isFltTechRole() ? FLT_TECH_STATUS_FILTERS : STATUS_FILTERS;
    const status = parseStatusFilterParam(params.get('status'), allowed);
    if (status) {
      this.statusFilter.set(status as StatusFilter);
    } else if (this.isFltTechRole()) {
      this.statusFilter.set('APPROVED');
    }
    const month = params.get('month');
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      this.activeMonth.set(month);
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
  }

  onMonthChange(month: string): void {
    this.activeMonth.set(month);
    this.load();
  }

  load(opts?: { quiet?: boolean }): void {
    if (!opts?.quiet) this.loading.set(true);
    this.apiError.set(false);
    this.svc.getAll({ month: this.activeMonth() }).subscribe({
      next: (res) => {
        if (res.success) {
          const rows = res.reservations ?? [];
          this.reservations.set(rows);
          this.alerts.watchPending('FLT', rows);
        } else {
          this.apiError.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.apiError.set(true);
        this.loading.set(false);
      },
    });
  }

  runExport(range: ExportDateRange): void {
    this.svc.getAll({ fromDate: range.startDate, toDate: range.endDate }).subscribe({
      next: (res) => {
        exportFltReservationsCsv(res.reservations ?? [], range);
        this.exportOpen.set(false);
        this.toast.set('FLT reservations exported to CSV');
      },
      error: () => {
        this.toast.set('Failed to export reservations');
      },
    });
  }

  requestConfirm(row: FltReservationRecord, action: ReservationStatus): void {
    if (this.isFltTechRole() && (action === 'APPROVED' || action === 'REJECTED')) {
      this.toast.set('FLT Tech cannot approve or reject pending reservations.');
      return;
    }
    this.confirm.set({ id: row.id, action, eventTitle: row.eventTitle });
  }

  openDetails(row: FltReservationRecord): void {
    this.detailsTarget.set(row);
  }

  closeDetails(): void {
    this.detailsTarget.set(null);
  }

  executeAction(): void {
    const state = this.confirm();
    if (!state) return;

    this.acting.set(state.id);
    this.svc.updateStatus(state.id, state.action).subscribe({
      next: (res) => {
        this.acting.set(null);
        this.confirm.set(null);
        if (res.success) {
          this.reservations.update(list => {
            let updated = list.map(r => r.id === state.id ? { ...r, status: state.action } : r);
            for (const cid of res.conflictedIds ?? []) {
              updated = updated.map(r => r.id === cid ? { ...r, status: 'CONFLICT' as ReservationStatus } : r);
            }
            updated = applyRevertedIds(updated, res.revertedIds);
            return updated;
          });
          const conflictNote = res.conflictedIds?.length
            ? ` ${res.conflictedIds.length} conflicting request(s) marked as CONFLICT.`
            : '';
          const revertNote = res.revertedIds?.length
            ? ` ${res.revertedIds.length} conflict(s) reverted to PENDING.`
            : '';
          this.toast.set(`Reservation ${state.action.toLowerCase()} successfully.${conflictNote}${revertNote}`);
        } else {
          this.toast.set(res.blockedReason ?? res.message ?? 'Action failed. Please try again.');
        }
      },
      error: (err) => {
        this.acting.set(null);
        this.confirm.set(null);
        const body = err?.error;
        this.toast.set(body?.blockedReason ?? body?.message ?? 'An error occurred. Please try again.');
      },
    });
  }

  // ─── Coordination ───────────────────────────────────────────────
  openCoordination(row: FltReservationRecord): void {
    this.coordinationTarget.set({ id: row.id, eventTitle: row.eventTitle });
  }

  closeCoordination(): void {
    this.coordinationTarget.set(null);
  }

  saveCoordination(slot: CoordinationSlot): void {
    const target = this.coordinationTarget();
    if (!target) return;
    this.coordSaving.set(true);
    const body: SetCoordinationRequest = { date: slot.date, startTime: slot.startTime, endTime: slot.endTime };
    this.svc.setCoordination(target.id, body).subscribe({
      next: (res) => {
        this.coordSaving.set(false);
        if (res.success) {
          this.reservations.update(list => list.map(r => r.id === target.id
            ? { ...r, coordinationDate: body.date, coordinationStartTime: body.startTime, coordinationEndTime: body.endTime }
            : r));
          this.toast.set('Coordination meeting saved.');
          this.closeCoordination();
        } else {
          this.toast.set('Failed to save coordination meeting.');
        }
      },
      error: () => { this.coordSaving.set(false); this.toast.set('An error occurred.'); },
    });
  }

  // ─── Reschedule ─────────────────────────────────────────────────
  openReschedule(row: FltReservationRecord): void {
    this.rescheduleTarget.set({ id: row.id, eventTitle: row.eventTitle });
  }

  closeReschedule(): void {
    this.rescheduleTarget.set(null);
  }

  saveReschedule(slots: ReservedDateSlot[]): void {
    const target = this.rescheduleTarget();
    if (!target || slots.length === 0) return;
    this.rescheduleSaving.set(true);
    this.svc.reschedule(target.id, slots).subscribe({
      next: (res) => {
        this.rescheduleSaving.set(false);
        if (res.success) {
          const newDates = JSON.stringify(slots);
          this.reservations.update(list => {
            let updated = list.map(r => r.id === target.id ? { ...r, reservedDates: newDates } : r);
            updated = applyRevertedIds(updated, res.revertedIds);
            return updated;
          });
          const revertNote = res.revertedIds?.length
            ? ` ${res.revertedIds.length} conflict(s) reverted to PENDING.`
            : '';
          this.toast.set(`Reservation rescheduled successfully.${revertNote}`);
          this.closeReschedule();
        } else {
          this.toast.set('Failed to reschedule reservation.');
        }
      },
      error: () => { this.rescheduleSaving.set(false); this.toast.set('An error occurred.'); },
    });
  }

  // ─── Maintenance ────────────────────────────────────────────────
  loadMaintenance(): void {
    this.maintSvc.getBlocks('FLT').subscribe({
      next: (res) => { if (res.success) this.maintenanceBlocks.set(res.blocks ?? []); },
      error: () => {},
    });
  }

  openMaintenance(): void { this.showMaintenance.set(true); }
  closeMaintenance(): void { this.showMaintenance.set(false); }

  addMaintenanceBlock(slot: MaintenanceSlot): void {
    this.maintSaving.set(true);
    this.maintSvc.createBlock({ facility: 'FLT', blockDate: slot.date, startTime: slot.startTime, endTime: slot.endTime, reason: slot.reason }).subscribe({
      next: (res) => {
        this.maintSaving.set(false);
        if (res.success && res.block) {
          this.maintenanceBlocks.update(list => [...list, res.block!]);
          this.toast.set('Maintenance block added.');
        } else {
          this.toast.set('Failed to add maintenance block.');
        }
      },
      error: () => { this.maintSaving.set(false); this.toast.set('Error adding maintenance block.'); },
    });
  }

  removeMaintenanceBlock(id: number): void {
    this.maintSvc.deleteBlock(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.maintenanceBlocks.update(list => list.filter(b => b.id !== id));
          this.toast.set('Maintenance block removed.');
        }
      },
      error: () => { this.toast.set('Error removing maintenance block.'); },
    });
  }

  actionLabel(action: ReservationStatus | string): string {
    const map: Record<string, string> = {
      APPROVED: 'Approve', REJECTED: 'Reject', CANCELLED: 'Cancel', COMPLETED: 'Mark as Complete',
    };
    return map[action] ?? action;
  }

  private readonly ROOM_TYPE_LABELS: Record<string, string> = {
    flt_theater: 'FLT Theater',
    amphitheater: 'Amphitheater',
    banquet_hall: 'Banquet Hall',
  };

  getRoomTypeLabel(value: string | null): string {
    if (!value) return '—';
    return this.ROOM_TYPE_LABELS[value] ?? value;
  }

  handleWsEvent(ev: ReservationWsEvent): void {
    const { updated, needsReload } = applyReservationWsEvent(this.reservations(), ev);
    if (needsReload) {
      this.load({ quiet: true });
      return;
    }
    this.reservations.set(updated);
  }

  hasApprovedOverlap(row: FltReservationRecord): boolean {
    const targetSlots = this.parseDates(row.reservedDates);
    if (!targetSlots.length) return false;
    for (const other of this.reservations()) {
      if (other.id === row.id) continue;
      if (other.status !== 'APPROVED' && other.status !== 'COMPLETED') continue;
      const otherSlots = [
        ...this.parseDates(other.reservedDates),
        ...(other.coordinationDate && other.coordinationStartTime && other.coordinationEndTime
          ? [{ date: other.coordinationDate, startTime: other.coordinationStartTime, endTime: other.coordinationEndTime }]
          : [])];
      if (this.slotsOverlap(targetSlots, otherSlots)) return true;
    }
    return false;
  }

  private slotsOverlap(a: ReservedDateSlot[], b: ReservedDateSlot[]): boolean {
    for (const sa of a) {
      for (const sb of b) {
        if (sa.date !== sb.date) continue;
        const aStart = parseInt(sa.startTime, 10);
        const aEnd = parseInt(sa.endTime, 10);
        const bStart = parseInt(sb.startTime, 10);
        const bEnd = parseInt(sb.endTime, 10);
        if (aStart < bEnd && aEnd > bStart) return true;
      }
    }
    return false;
  }

  parseDates(json: string): ReservedDateSlot[] {
    try { return JSON.parse(json) ?? []; } catch { return []; }
  }

  parseEquipment(json: string | null): RequestedEquipmentItem[] {
    if (!json) return [];
    try { return JSON.parse(json) ?? []; } catch { return []; }
  }

  formatDate(iso: string): string {
    return formatReadableDateTime(iso);
  }

  formatSlotTime(start: string, end: string): string {
    return `${formatTime12(start)}–${formatTime12(end)}`;
  }

  async downloadReservationForm(row: FltReservationRecord): Promise<void> {
    if (!row.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) {
      this.toast.set('Please set coordination meeting first before downloading.');
      return;
    }

    const slots = this.parseDates(row.reservedDates);
    const equipment = this.parseEquipment(row.requestedEquipment).map(e => e.name).join(', ') || '–';
    const slotDates = slots.map(s => `${s.date}`).join(', ') || '–';
    const slotTimes = slots.map(s => `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`).join(', ') || '–';
    const room = row.roomType ? this.getRoomTypeLabel(row.roomType) : '–';

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 48;
      let y = 52;
      const line = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(label, marginX, y);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(String(value ?? '–'), 340);
        doc.text(wrapped, marginX + 160, y);
        y += Math.max(18, wrapped.length * 14);
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('FLT Theater Reservation Form', marginX, y);
      y += 22;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Lyceum of the Philippines University – Laguna', marginX, y);
      y += 18;
      doc.setDrawColor(120);
      doc.line(marginX, y, 547, y);
      y += 20;

      line('Event Title:', String(row.eventTitle ?? ''));
      line('Event Type:', String(row.eventType ?? ''));
      line('Room:', room);
      line('Expected Attendees:', String(row.expectedAttendees ?? ''));
      line('Event Date(s):', slotDates);
      line('Event Time(s):', slotTimes);
      line('Organization / Dept:', `${row.organization ?? ''} / ${row.department ?? ''}`);
      line('Contact Person:', String(row.contactPerson ?? ''));
      line('Contact Number:', String(row.contactNumber ?? ''));
      line('Contact Email:', String(row.contactEmail ?? ''));
      line('Equipment:', equipment);
      line('Additional Instructions:', String(row.additionalInstructions ?? ''));
      line('Coordination Date:', String(row.coordinationDate ?? ''));
      line('Coordination Time:', `${row.coordinationStartTime ?? ''} - ${row.coordinationEndTime ?? ''}`);

      y += 12;
      doc.setDrawColor(120);
      doc.line(marginX, y, 547, y);
      y += 24;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.text('Generated from LPU Laguna Reservation System', marginX, y);

      doc.save(`FLT-Reservation-Form-${row.id}.pdf`);
      this.toast.set('Reservation form downloaded as PDF.');
    } catch (err: any) {
      console.error('downloadReservationForm error', err);
      this.toast.set('Failed to generate form: ' + (err?.message ?? 'unknown error'));
    }
  }

}
