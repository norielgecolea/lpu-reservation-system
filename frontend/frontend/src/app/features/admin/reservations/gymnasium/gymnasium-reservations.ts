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
import { GymnasiumRescheduleCalendar, GymRescheduleEvent } from './gymnasium-reschedule-calendar';
import { GymCoordinationSlot, GymnasiumCoordinationCalendar } from './gymnasium-coordination-calendar';
import { UiButton, UiIcon, UiInputSearch, UiToast, UiDateSelector } from '../../../../shared/ui';
import { MaintenanceBlock, MaintenanceService } from '../../../admin/maintenance/maintenance.service';
import { countUpcomingMaintenanceBlocks } from '../../../admin/maintenance/maintenance.util';
import { getCurrentYearMonth, reservationRecordToSummaryEvent } from '../../dashboard/dashboard-events.util';
import { formatReadableDateTime, formatTime12 } from '../../../../shared/utils/datetime.util';
import { DashboardEventSummaryModal } from '../../dashboard/dashboard-event-summary-modal';
import {
  buildApproverStatusChips,
  parseStatusFilterParam,
  reservationMatchesStatusFilter,
  sortApproverReservations,
} from '../reservation-filter.util';
import { ReservationApproverStatusChips } from '../reservation-approver-status-chips';
import { ReservationStatusPill } from '../reservation-status-pill';
import { MaintenanceCalendarPicker, MaintenanceSlot, ScheduledEvent } from '../../../admin/maintenance/maintenance-calendar-picker';
import {
  GymnasiumReservationDetailsEditRequest,
  GymReservationRecord,
  RequestedEquipmentItem,
  ReservationStatus,
  ReservedDateSlot,
  SetCoordinationRequest,
} from './gymnasium-reservations.models';
import { GymReservationsService } from './gymnasium-reservations.service';
import { ReservationRealtimeService, ReservationWsEvent } from '../reservation-realtime.service';
import { ReservationAlertService } from '../reservation-alert.service';
import { applyRevertedIds, applyReservationWsEvent } from '../reservation-ws.util';
import { ReservationExportModal } from '../reservation-export-modal';
import { exportGymReservationsCsv, ExportDateRange } from '../reservation-export.util';
import { adminAddReservationPath } from '../admin-reservation-path.util';
import { ApprovedReservationActionsMenu } from '../approved-reservation-actions-menu';
import { ReservationApproverTableSkeleton } from '../reservation-approver-table-skeleton';
import { ReservationApproverMobileSkeleton } from '../reservation-approver-mobile-skeleton';
import { downloadGymnasiumReservationForm } from './gymnasium-reservation-form-export.util';
import { GymnasiumEditDetailsModal } from './gymnasium-edit-details-modal';
import { AuthService } from '../../../../core/auth/auth.service';
import { isSuperAdmin } from '../../../../core/auth/roles';
import {
  buildApprovedOverlapIds,
  parseEquipmentJson,
  parseReservedDatesJson,
} from '../reservation-row.util';

const STATUS_FILTERS = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface ConfirmState {
  id: number;
  action: ReservationStatus;
  eventTitle: string;
}

interface GymReservationViewRow extends GymReservationRecord {
  parsedSlots: ReservedDateSlot[];
  parsedEquipment: RequestedEquipmentItem[];
  hasScheduleConflict: boolean;
}

@Component({
  selector: 'app-gymnasium-reservations',
  imports: [ RouterLink, UiButton, UiIcon, UiInputSearch, UiToast, UiDateSelector, GymnasiumRescheduleCalendar, GymnasiumCoordinationCalendar, GymnasiumEditDetailsModal, MaintenanceCalendarPicker, ReservationExportModal, ApprovedReservationActionsMenu, ReservationApproverTableSkeleton, ReservationApproverMobileSkeleton, DashboardEventSummaryModal, ReservationApproverStatusChips, ReservationStatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-none flex-col gap-4 md:min-h-0 md:flex-1' },
  template: `
    <!-- Header -->
      <section class="animate-rise flex shrink-0 flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 shadow-sm shadow-primary/5">
              <ui-icon name="sports_basketball" class="text-2xl" />
            </div>
            <div class="min-w-0">
              <h1 class="text-xl font-black tracking-tight text-gray-900">Gymnasium Reservations</h1>
              <p class="mt-0.5 text-sm text-gray-500">Review requests, set coordination, and keep the gym schedule clear</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <a uiButton [routerLink]="addReservationPath">
              <ui-icon name="add" class="text-base" />
              <span class="hidden sm:inline">Add Reservation</span>
            </a>
            <button type="button" (click)="exportOpen.set(true)"
              class="flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white/80 px-3 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-white transition-colors cursor-pointer">
              <ui-icon name="download" class="text-base" />
              <span class="hidden sm:inline">Export</span>
            </button>
            <button type="button" (click)="openMaintenance()"
              class="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer">
              <ui-icon name="construction" class="text-base" />
              <span class="hidden sm:inline">Maintenance</span>
              @if (upcomingMaintenanceCount() > 0) {
                <span class="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-white w-4 h-4 text-[9px] font-black">{{ upcomingMaintenanceCount() }}</span>
              }
            </button>
            <div class="hidden items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-500 sm:flex">
              <span class="tabular-nums text-gray-800">{{ filtered().length }}</span>
              <span>of {{ reservations().length }}</span>
            </div>
          </div>
        </div>
        <app-reservation-approver-status-chips
          [chips]="statusChips()"
          [value]="statusFilter()"
          (valueChange)="statusFilter.set($any($event))"
        />
      </section>

      <!-- Filters -->
      <section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ui-date-selector [value]="activeMonth()" (valueChange)="onMonthChange($event)" />
        <ui-input-search
          placeholder="Search by event, department, contact..."
          (valueChange)="search.set($event)"
          class="w-full sm:min-w-48 sm:flex-1 min-w-0"
        />
      </section>

      <!-- Table -->
      <section class="list-panel animate-rise flex flex-col rounded-2xl max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
        @if (apiError()) {
          <div class="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-inset ring-red-100">
              <ui-icon name="cloud_off" class="text-3xl text-red-400" />
            </div>
            <p class="text-sm font-semibold text-red-600">Failed to load reservations</p>
            <p class="text-xs text-gray-400 max-w-xs">The server could not be reached or returned an error. Make sure the backend is running and your session is valid.</p>
            <button
              type="button"
              (click)="load()"
              class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer mt-1"
            >
              <ui-icon name="refresh" class="text-base" />
              Retry
            </button>
          </div>
        } @else if (!loading() && filtered().length === 0) {
          <div class="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-inset ring-gray-100">
              <ui-icon name="event_busy" class="text-3xl text-gray-300" />
            </div>
            <p class="text-sm font-semibold text-gray-600">No reservations found</p>
            <p class="text-xs text-gray-400">Try another status, month, or search term</p>
          </div>
        } @else {
          @if (loading()) {
            <app-reservation-approver-mobile-skeleton />
          } @else {
            <div class="md:hidden flex flex-col gap-3 p-3">
              @for (row of filtered(); track row.id) {
                <div
                  class="rounded-2xl border bg-white p-4 shadow-sm ring-1 ring-inset ring-black/[0.02] transition-shadow"
                  [class.border-gray-100]="row.status !== 'PENDING' && row.status !== 'CONFLICT'"
                  [class.border-amber-200/80]="row.status === 'PENDING'"
                  [class.border-orange-300/80]="row.status === 'CONFLICT'"
                  [class.shadow-amber-100/50]="row.status === 'PENDING'"
                >
                  <div class="cursor-pointer" (click)="openDetails(row)">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex-1">
                        <p class="text-[11px] text-gray-400 font-mono">#{{ row.id }}</p>
                        <p class="font-semibold text-gray-900 leading-snug">{{ row.eventTitle }}</p>
                        @if (row.numberOfAttendees) {
                          <p class="text-xs text-gray-500 mt-0.5">{{ row.numberOfAttendees }} attendees</p>
                        }
                      </div>
                      <app-reservation-status-pill [status]="row.status" />
                    </div>
                    <div class="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                      <p class="text-xs text-gray-500 truncate">{{ row.department }} · {{ row.organization }}</p>
                      @for (slot of row.parsedSlots; track slot.date) {
                        <div class="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <ui-icon name="calendar_today" class="text-[12px] text-primary shrink-0" />
                          <span class="font-medium">{{ slot.date }}</span>
                          <span class="text-gray-400">{{ formatSlotTime(slot.startTime, slot.endTime) }}</span>
                        </div>
                      }
                      <p class="text-[11px] text-gray-400">Submitted {{ formatDate(row.createdAt) }}</p>
                      @if (row.additionalInstructions) {
                        <p class="text-[11px] italic text-amber-700 truncate" [title]="row.additionalInstructions">
                          Note: {{ row.additionalInstructions }}
                        </p>
                      }
                      @if (row.status === 'PENDING' && row.hasScheduleConflict) {
                        <p class="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700 ring-1 ring-inset ring-orange-200">
                          <ui-icon name="warning" class="text-sm" />
                          Conflict schedule
                        </p>
                      }
                      @if (row.status === 'COMPLETED' && row.satisfactionRating) {
                        <div class="flex items-center gap-0.5" [title]="row.satisfactionRating + ' / 5'">
                          @for (star of [1,2,3,4,5]; track star) {
                            <span class="text-sm" [class.text-yellow-400]="star <= row.satisfactionRating!" [class.text-gray-300]="star > row.satisfactionRating!">★</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    @if (row.status === 'PENDING') {
                      @if (isSuperAdminRole()) {
                        <button
                          type="button"
                          (click)="openEditDetails(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="edit" class="text-sm" />
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          (click)="requestDelete(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="delete" class="text-sm" />
                          <span class="hidden sm:inline">Delete</span>
                        </button>
                      }
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
                    } @else if (row.status === 'CONFLICT') {
                      @if (isSuperAdminRole()) {
                        <button
                          type="button"
                          (click)="openEditDetails(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="edit" class="text-sm" />
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          type="button"
                          (click)="requestDelete(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="delete" class="text-sm" />
                          <span class="hidden sm:inline">Delete</span>
                        </button>
                      }
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
                        [disabled]="acting() === row.id"
                      >
                        @if (isSuperAdminRole()) {
                          <button
                            type="button"
                            (click)="openEditDetails(row)"
                            [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ui-icon name="edit" class="text-sm" />
                            Edit
                          </button>
                          <button
                            type="button"
                            (click)="requestDelete(row)"
                            [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ui-icon name="delete" class="text-sm" />
                            Delete
                          </button>
                        }
                        <button
                          type="button"
                          (click)="printForm(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="download" class="text-sm" />
                          <span class="hidden sm:inline">Download Form</span>
                        </button>
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
                    } @else if (isSuperAdminRole()) {
                      <app-approved-reservation-actions-menu [disabled]="acting() === row.id">
                        <button
                          type="button"
                          (click)="requestDelete(row)"
                          [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ui-icon name="delete" class="text-sm" />
                          Delete
                        </button>
                      </app-approved-reservation-actions-menu>
                    }
                  </div>
                </div>
              }
            </div>
          }
          <div class="hidden md:block min-h-0 flex-1 overflow-auto">
            <table class="w-full text-sm border-collapse bg-white/90">
              <thead class="sticky top-0 z-10">
                <tr class="border-b border-gray-100/90 bg-gray-50/95 backdrop-blur-sm">
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 w-10">#</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Event</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden md:table-cell">Dept / Org</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Contact</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden xl:table-cell">Dates</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Attendees</th>
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
                <tr
                  class="border-b border-gray-50/80 border-l-4 transition-colors hover:bg-gray-50/70"
                  [class.border-l-transparent]="row.status !== 'PENDING' && row.status !== 'CONFLICT'"
                  [class.border-l-amber-400]="row.status === 'PENDING'"
                  [class.border-l-orange-500]="row.status === 'CONFLICT'"
                  [class.bg-amber-50/30]="row.status === 'PENDING'"
                  [class.bg-orange-50/40]="row.status === 'CONFLICT'"
                >
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">{{ row.id }}</td>

                  <!-- Event -->
                  <td class="px-4 py-3 max-w-[200px] cursor-pointer hover:bg-gray-50/80 transition-colors" (click)="openDetails(row)">
                    <p class="font-semibold text-gray-900 truncate">{{ row.eventTitle }}</p>
                    @if (row.additionalInstructions) {
                      <p class="mt-1 text-[10px] italic text-amber-600 truncate max-w-[180px]" [title]="row.additionalInstructions">
                        Note: {{ row.additionalInstructions }}
                      </p>
                    }
                    <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDate(row.createdAt) }}</p>
                    <p class="mt-1 text-[10px] font-medium text-primary/80">View full summary</p>
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
                    @for (slot of row.parsedSlots; track slot.date) {
                      <div class="text-[11px] leading-tight text-gray-600 flex items-center gap-1 mb-0.5">
                        <ui-icon name="calendar_today" class="text-[10px] text-primary shrink-0" />
                        <span>{{ slot.date }}</span>
                        <span class="text-gray-400">{{ formatSlotTime(slot.startTime, slot.endTime) }}</span>
                      </div>
                    }
                  </td>

                  <!-- Attendees -->
                  <td class="px-4 py-3 hidden lg:table-cell max-w-[100px]">
                    @if (row.numberOfAttendees) {
                      <p class="text-xs font-medium text-gray-700">{{ row.numberOfAttendees }} pax</p>
                    } @else {
                      <span class="text-xs text-gray-400">—</span>
                    }
                  </td>

                  <!-- Equipment -->
                  <td class="px-4 py-3 hidden xl:table-cell max-w-[140px]">
                    @if (row.parsedEquipment.length > 0) {
                      @for (eq of row.parsedEquipment; track eq.id) {
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
                    <app-reservation-status-pill [status]="row.status" />
                    @if (row.status === 'PENDING' && row.hasScheduleConflict) {
                      <p class="mt-1 text-[10px] font-semibold text-orange-600">Conflict schedule</p>
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
                    @if (row.status === 'PENDING') {
                      <div class="flex items-center justify-end gap-1.5">
                        @if (isSuperAdminRole()) {
                          <button type="button" (click)="openEditDetails(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="edit" class="text-sm" />
                            <span class="hidden sm:inline">Edit</span>
                          </button>
                          <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="delete" class="text-sm" />
                            <span class="hidden sm:inline">Delete</span>
                          </button>
                        }
                        <button type="button" (click)="requestConfirm(row, 'APPROVED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="check_circle" class="text-sm" />
                          <span class="hidden sm:inline">Approve</span>
                        </button>
                        <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="cancel" class="text-sm" />
                          <span class="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    } @else if (row.status === 'CONFLICT') {
                      <div class="flex items-center justify-end gap-1.5">
                        @if (isSuperAdminRole()) {
                          <button type="button" (click)="openEditDetails(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="edit" class="text-sm" />
                            <span class="hidden sm:inline">Edit</span>
                          </button>
                          <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="delete" class="text-sm" />
                            <span class="hidden sm:inline">Delete</span>
                          </button>
                        }
                        <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="cancel" class="text-sm" />
                          <span class="hidden sm:inline">Reject</span>
                        </button>
                      </div>
                    } @else if (row.status === 'APPROVED') {
                      <app-approved-reservation-actions-menu
                        [disabled]="acting() === row.id"
                      >
                        @if (isSuperAdminRole()) {
                          <button type="button" (click)="openEditDetails(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="edit" class="text-sm" />
                            Edit
                          </button>
                          <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                            class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <ui-icon name="delete" class="text-sm" />
                            Delete
                          </button>
                        }
                        <button type="button" (click)="printForm(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="download" class="text-sm" />
                          <span class="hidden sm:inline">Download Form</span>
                        </button>
                        <button type="button" (click)="openCoordination(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          [title]="row.coordinationDate ? 'Update coordination: ' + row.coordinationDate : 'Set coordination meeting'">
                          <ui-icon name="handshake" class="text-sm" />
                          {{ row.coordinationDate ? 'Coordination ✓' : 'Coordination' }}
                        </button>
                        <button type="button" (click)="openReschedule(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="edit_calendar" class="text-sm" />
                          Reschedule
                        </button>
                        <button type="button" (click)="requestConfirm(row, 'COMPLETED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="task_alt" class="text-sm" />
                          Complete
                        </button>
                        <button type="button" (click)="requestConfirm(row, 'CANCELLED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="block" class="text-sm" />
                          Cancel
                        </button>
                      </app-approved-reservation-actions-menu>
                    } @else if (isSuperAdminRole()) {
                      <app-approved-reservation-actions-menu [disabled]="acting() === row.id">
                        <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="delete" class="text-sm" />
                          Delete
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
        <app-dashboard-event-summary-modal [event]="event" (closed)="closeDetails()" (printForm)="printFormFromDetails()" (setCoordination)="openCoordinationFromDetails()" />
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
                  <strong>"{{ confirm()!.eventTitle }}"</strong> as <strong class="lowercase">{{ confirm()!.action.toLowerCase() }}</strong>?
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <button type="button" (click)="confirm.set(null)"
                class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                Cancel
              </button>
              <button type="button" (click)="executeAction()" [disabled]="acting() !== null"
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
                @if (acting() !== null) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                @else { Confirm }
              </button>
            </div>
          </div>
        </div>
      }


      @if (deleteTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="deleteTarget.set(null)">
          <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4" (click)="$event.stopPropagation()">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <ui-icon name="delete" class="text-red-600 text-xl" />
              </div>
              <div class="flex-1 min-w-0">
                <h2 class="text-sm font-bold text-gray-900">Delete Event</h2>
                <p class="text-xs text-gray-500 mt-1">
                  Permanently delete
                  <strong>"{{ deleteTarget()!.eventTitle }}"</strong>?
                  This cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex gap-2 justify-end">
              <button type="button" (click)="deleteTarget.set(null)"
                class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                Cancel
              </button>
              <button type="button" (click)="executeDelete()" [disabled]="acting() !== null"
                class="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-bold text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                @if (acting() !== null) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                @else { Delete }
              </button>
            </div>
          </div>
        </div>
      }

      <ui-toast [message]="toast()" (dismissed)="toast.set('')" />

    @if (exportOpen()) {
      <app-reservation-export-modal
        serviceName="Gymnasium"
        (closed)="exportOpen.set(false)"
        (exported)="runExport($event)"
      />
    }
    <!-- Coordination Calendar Overlay -->
    @if (coordinationTarget()) {
      <app-gymnasium-coordination-calendar
        [events]="coordinationCalendarEvents()"
        [eventTitle]="coordinationTarget()!.eventTitle"
        [saving]="coordSaving"
        [initial]="coordinationInitialSlot()"
        (saved)="saveCoordination($event)"
        (cancelled)="closeCoordination()"
      />
    }

    @if (editTarget(); as editRow) {
      <app-gymnasium-edit-details-modal
        [reservation]="editRow"
        [saving]="editSaving()"
        (saved)="saveEditDetails($event)"
        (cancelled)="closeEditDetails()"
      />
    }

    <!-- Reschedule Calendar Overlay -->
    @if (rescheduleTarget()) {
      <app-gymnasium-reschedule-calendar
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
        facilityLabel="Gymnasium"
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
export class GymnasiumReservations implements OnInit, OnDestroy {
  private readonly svc = inject(GymReservationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly maintSvc = inject(MaintenanceService);
  private readonly realtime = inject(ReservationRealtimeService);
  private readonly alerts = inject(ReservationAlertService);
  private readonly auth = inject(AuthService);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  protected readonly isSuperAdminRole = computed(() => isSuperAdmin(this.auth.user()?.role));

  protected readonly addReservationPath = adminAddReservationPath('gymnasium', this.router.url);

  readonly loading = signal(true);
  readonly apiError = signal(false);
  readonly reservations = signal<GymReservationRecord[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('PENDING');
  readonly activeMonth = signal(getCurrentYearMonth());
  readonly acting = signal<number | null>(null);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly deleteTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly detailsTarget = signal<GymReservationRecord | null>(null);
  readonly editTarget = signal<GymReservationRecord | null>(null);
  readonly editSaving = signal(false);

  protected readonly detailsSummaryEvent = computed(() => {
    const row = this.detailsTarget();
    return row ? reservationRecordToSummaryEvent(row, 'Gymnasium') : null;
  });
  readonly toast = signal('');
  readonly exportOpen = signal(false);

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

  readonly coordinationTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly coordSaving = signal(false);

  readonly rescheduleTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly rescheduleSaving = signal(false);

  readonly rescheduleApprovedEvents = computed<GymRescheduleEvent[]>(() => {
    const target = this.rescheduleTarget();
    const events: GymRescheduleEvent[] = [];
    for (const r of this.reservations()) {
      if (r.id === target?.id) continue;
      if (r.status === 'PENDING') {
        try {
          const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
          for (const s of slots) {
            events.push({ date: s.date, startTime: s.startTime, endTime: s.endTime, department: r.department, organization: r.organization, eventKind: 'PENDING' });
          }
        } catch { /* skip */ }
        continue;
      }
      if (r.status !== 'APPROVED' && r.status !== 'COMPLETED') continue;
      try {
        const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
        for (const s of slots) {
          events.push({ date: s.date, startTime: s.startTime, endTime: s.endTime, department: r.department, organization: r.organization, eventKind: 'RESERVATION' });
        }
      } catch { /* skip */ }
      if (r.coordinationDate && r.coordinationStartTime && r.coordinationEndTime) {
        events.push({ date: r.coordinationDate, startTime: r.coordinationStartTime, endTime: r.coordinationEndTime, department: r.department, organization: r.organization, eventKind: 'COORDINATION' });
      }
    }
    return events;
  });

  readonly rescheduleInitialSlots = computed<ReservedDateSlot[]>(() => {
    const target = this.rescheduleTarget();
    if (!target) return [];
    const row = this.reservations().find(r => r.id === target.id);
    if (!row) return [];
    try { return JSON.parse(row.reservedDates); } catch { return []; }
  });

  readonly coordinationCalendarEvents = computed<GymRescheduleEvent[]>(() => {
    const target = this.coordinationTarget();
    return this.reservations().flatMap((r): GymRescheduleEvent[] => {
      const isTarget = !!target && r.id === target.id;
      if (!isTarget && r.status !== 'APPROVED' && r.status !== 'COMPLETED' && r.status !== 'PENDING') return [];
      const events: GymRescheduleEvent[] = [];
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
            eventKind: isTarget ? 'TARGET' : r.status === 'PENDING' ? 'PENDING' : 'RESERVATION',
          });
        }
      } catch { /* skip */ }
      if (
        r.coordinationDate && r.coordinationStartTime && r.coordinationEndTime
        && !isTarget && r.status !== 'PENDING'
      ) {
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

  readonly coordinationInitialSlot = computed<GymCoordinationSlot | null>(() => {
    const target = this.coordinationTarget();
    if (!target) return null;
    const row = this.reservations().find(r => r.id === target.id);
    if (!row?.coordinationDate || !row.coordinationStartTime || !row.coordinationEndTime) return null;
    return { date: row.coordinationDate, startTime: row.coordinationStartTime, endTime: row.coordinationEndTime };
  });

  readonly statusChips = computed(() =>
    buildApproverStatusChips(STATUS_FILTERS, this.reservations()),
  );

  readonly filtered = computed((): GymReservationViewRow[] => {
    const q = this.search().toLowerCase().trim();
    const status = this.statusFilter();
    const all = this.reservations();
    const conflictIds = buildApprovedOverlapIds(all);
    const rows = all.filter(r => {
      const matchStatus = reservationMatchesStatusFilter(status, r.status);
      const matchSearch = !q
        || r.eventTitle.toLowerCase().includes(q)
        || r.department.toLowerCase().includes(q)
        || r.organization.toLowerCase().includes(q)
        || r.contactPerson.toLowerCase().includes(q)
        || r.contactEmail.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
    return sortApproverReservations(rows).map(r => ({
      ...r,
      parsedSlots: parseReservedDatesJson(r.reservedDates) as ReservedDateSlot[],
      parsedEquipment: parseEquipmentJson<RequestedEquipmentItem>(r.requestedEquipment),
      hasScheduleConflict: conflictIds.has(r.id),
    }));
  });

  ngOnInit(): void {
    this.applyDashboardQueryParams();
    this.load();
    this.loadMaintenance();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.gymUpdates$.subscribe(ev => this.handleWsEvent(ev));
    this.pollSub = this.realtime.refreshTicks$.subscribe(() => this.load({ quiet: true }));
  }

  private applyDashboardQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = parseStatusFilterParam(params.get('status'), STATUS_FILTERS);
    if (status) this.statusFilter.set(status as StatusFilter);
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
          this.alerts.watchPending('GYMNASIUM', rows);
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
        exportGymReservationsCsv(res.reservations ?? [], range);
        this.exportOpen.set(false);
        this.toast.set('Gymnasium reservations exported to CSV');
      },
      error: () => {
        this.toast.set('Failed to export reservations');
      },
    });
  }

  requestConfirm(row: GymReservationRecord, action: ReservationStatus): void {
    this.confirm.set({ id: row.id, action, eventTitle: row.eventTitle });
  }

  openDetails(row: GymReservationRecord): void { this.detailsTarget.set(row); }
  closeDetails(): void { this.detailsTarget.set(null); }

  openCoordinationFromDetails(): void {
    const row = this.detailsTarget();
    if (!row) return;
    this.closeDetails();
    this.openCoordination(row);
  }

  async printForm(row: GymReservationRecord): Promise<void> {
    try {
      await downloadGymnasiumReservationForm(row);
    } catch {
      this.toast.set('Failed to generate the facilities reservation form. Please try again.');
    }
  }

  printFormFromDetails(): void {
    const row = this.detailsTarget();
    if (row) void this.printForm(row);
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


  // ─── Delete event (Super Admin) ─────────────────────────────────
  requestDelete(row: { id: number; eventTitle: string }): void {
    if (!this.isSuperAdminRole()) return;
    this.deleteTarget.set({ id: row.id, eventTitle: row.eventTitle });
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.acting.set(target.id);
    this.svc.delete(target.id).subscribe({
      next: (res) => {
        this.acting.set(null);
        this.deleteTarget.set(null);
        if (res.success) {
          this.reservations.update(list => {
            let updated = list.filter(r => r.id !== target.id);
            updated = applyRevertedIds(updated, res.revertedIds);
            return updated;
          });
          this.toast.set('Event deleted.');
        } else {
          this.toast.set(res.message ?? 'Failed to delete event.');
        }
      },
      error: (err) => {
        this.acting.set(null);
        this.deleteTarget.set(null);
        this.toast.set(err?.error?.message ?? 'Failed to delete event.');
      },
    });
  }

  // ─── Edit details (Super Admin) ─────────────────────────────────
  openEditDetails(row: GymReservationRecord): void {
    if (!this.isSuperAdminRole()) return;
    this.editTarget.set(row);
  }

  closeEditDetails(): void {
    this.editTarget.set(null);
    this.editSaving.set(false);
  }

  saveEditDetails(body: GymnasiumReservationDetailsEditRequest): void {
    const target = this.editTarget();
    if (!target) return;
    this.editSaving.set(true);
    this.svc.updateDetails(target.id, body).subscribe({
      next: (res) => {
        this.editSaving.set(false);
        if (res.success) {
          this.reservations.update((list) =>
            list.map((r) =>
              r.id === target.id
                ? {
                    ...r,
                    eventTitle: body.eventTitle,
                    department: body.department,
                    organization: body.organization,
                    contactPerson: body.contactPerson,
                    contactEmail: body.contactEmail,
                    contactNumber: body.contactNumber,
                    numberOfAttendees: String(body.numberOfAttendees),
                    additionalInstructions: body.additionalInstructions,
                    requestedEquipment: JSON.stringify(body.requestedEquipment),
                  }
                : r,
            ),
          );
          this.toast.set('Event details updated.');
          this.closeEditDetails();
        } else {
          this.toast.set(res.message || 'Failed to update event details.');
        }
      },
      error: (err) => {
        this.editSaving.set(false);
        this.toast.set(err?.error?.message ?? 'Failed to update event details.');
      },
    });
  }

  openCoordination(row: GymReservationRecord): void {
    this.coordinationTarget.set({ id: row.id, eventTitle: row.eventTitle });
  }
  closeCoordination(): void { this.coordinationTarget.set(null); }

  saveCoordination(slot: GymCoordinationSlot): void {
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

  openReschedule(row: GymReservationRecord): void {
    this.rescheduleTarget.set({ id: row.id, eventTitle: row.eventTitle });
  }
  closeReschedule(): void { this.rescheduleTarget.set(null); }

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
    this.maintSvc.getBlocks('GYMNASIUM').subscribe({
      next: (res) => { if (res.success) this.maintenanceBlocks.set(res.blocks ?? []); },
      error: () => {},
    });
  }

  openMaintenance(): void { this.showMaintenance.set(true); }
  closeMaintenance(): void { this.showMaintenance.set(false); }

  addMaintenanceBlock(slot: MaintenanceSlot): void {
    this.maintSaving.set(true);
    this.maintSvc.createBlock({ facility: 'GYMNASIUM', blockDate: slot.date, startTime: slot.startTime, endTime: slot.endTime, reason: slot.reason }).subscribe({
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

  handleWsEvent(ev: ReservationWsEvent): void {
    const { updated, needsReload } = applyReservationWsEvent(this.reservations(), ev);
    if (needsReload) {
      this.load({ quiet: true });
      return;
    }
    this.reservations.set(updated);
  }

  formatDate(iso: string): string {
    return formatReadableDateTime(iso);
  }

  formatSlotTime(start: string, end: string): string {
    return `${formatTime12(start)}–${formatTime12(end)}`;
  }
}
