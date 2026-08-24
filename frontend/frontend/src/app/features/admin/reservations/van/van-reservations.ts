import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { VanRescheduleCalendar, VanRescheduleEvent } from './van-reschedule-calendar';
import { VanApproveModal, VanApproveResult } from './van-approve-modal';
import { UiButton, UiIcon, UiInputSearch, UiToast, UiDateSelector } from '../../../../shared/ui';
import { getCurrentYearMonth, reservationRecordToSummaryEvent, vanRecordsToDashboardRecords } from '../../dashboard/dashboard-events.util';
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
import {
  ReservationStatus,
  ReservedDateSlot,
  VanReservationDetailsEditRequest,
  VanReservationRow,
} from './van-reservations.models';
import { VanReservationsService } from './van-reservations.service';
import { ReservationRealtimeService, ReservationWsEvent } from '../reservation-realtime.service';
import { ReservationAlertService } from '../reservation-alert.service';
import { applyRevertedIds, applyReservationWsEvent } from '../reservation-ws.util';
import { ReservationExportModal } from '../reservation-export-modal';
import { exportVanReservationsCsv, ExportDateRange } from '../reservation-export.util';
import { adminAddReservationPath } from '../admin-reservation-path.util';
import { ApprovedReservationActionsMenu } from '../approved-reservation-actions-menu';
import { ReservationApproverTableSkeleton } from '../reservation-approver-table-skeleton';
import { ReservationApproverMobileSkeleton } from '../reservation-approver-mobile-skeleton';
import { downloadVanReservationForm } from './van-reservation-form-export.util';
import { VanEditDetailsModal } from './van-edit-details-modal';
import { AuthService } from '../../../../core/auth/auth.service';
import { isSuperAdmin } from '../../../../core/auth/roles';
import { parseReservedDatesJson } from '../reservation-row.util';

const STATUS_FILTERS = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface ConfirmState {
  id: number;
  action: ReservationStatus;
  tripTitle: string;
}

interface VanReservationViewRow extends VanReservationRow {
  parsedSlots: ReservedDateSlot[];
}

@Component({
  selector: 'app-van-reservations',
  imports: [ RouterLink, UiButton, UiIcon, UiInputSearch, UiToast, UiDateSelector, VanRescheduleCalendar, VanApproveModal, VanEditDetailsModal, ReservationExportModal, ApprovedReservationActionsMenu, ReservationApproverTableSkeleton, ReservationApproverMobileSkeleton, DashboardEventSummaryModal, ReservationApproverStatusChips, ReservationStatusPill],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-none flex-col gap-4 md:min-h-0 md:flex-1' },
  template: `
    <section class="animate-rise flex shrink-0 flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 shadow-sm shadow-primary/5">
              <ui-icon name="airport_shuttle" class="text-2xl" />
            </div>
            <div class="min-w-0">
              <h1 class="text-xl font-black tracking-tight text-gray-900">University Van Reservations</h1>
              <p class="mt-0.5 text-sm text-gray-500">Assign one or more vehicles, then approve trip requests</p>
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

      <section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ui-date-selector [value]="activeMonth()" (valueChange)="onMonthChange($event)" />
        <ui-input-search
          placeholder="Search by destination, department, contact, passengers..."
          (valueChange)="search.set($event)"
          class="w-full min-w-0 sm:min-w-48 sm:flex-1"
        />
      </section>

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
                        <p class="font-semibold text-gray-900 leading-snug">{{ row.travelDestination }}</p>
                      </div>
                      <app-reservation-status-pill [status]="row.status" />
                    </div>
                    <div class="mt-3 space-y-1.5 border-t border-gray-50 pt-3">
                      <p class="text-xs text-gray-500 truncate">{{ row.school || 'LPU-L' }} · {{ row.department }} · {{ row.organization }}</p>
                      @for (slot of row.parsedSlots; track slot.date) {
                        <div class="flex items-center gap-1.5 text-[11px] text-gray-600">
                          <ui-icon name="calendar_today" class="text-[12px] text-primary shrink-0" />
                          <span class="font-medium">{{ slot.date }}</span>
                          <span class="text-gray-400">{{ formatSlotTime(slot.startTime, slot.endTime) }}</span>
                        </div>
                      }
                      @if (row.returnTime) {
                        <p class="text-[11px] text-primary">Return: {{ row.returnTime }}</p>
                      }
                      <p class="text-[11px] text-gray-400">Submitted {{ formatDate(row.createdAt) }}</p>
                      @if (row.additionalRemarks) {
                        <p class="text-[11px] italic text-amber-700 truncate" [title]="row.additionalRemarks">
                          Note: {{ row.additionalRemarks }}
                        </p>
                      }
                      @if (row.vehicleLabel || row.driverName) {
                        <p class="text-[11px] text-gray-500 truncate">
                          {{ row.vehicleLabel || 'No vehicle' }} · {{ row.driverName || 'No driver' }}
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
                        <button type="button" (click)="openEditDetails(row)" [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="edit" class="text-sm" />
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="delete" class="text-sm" />
                          <span class="hidden sm:inline">Delete</span>
                        </button>
                      }
                      <button type="button" (click)="openApprove(row)" [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <ui-icon name="check_circle" class="text-sm" />
                        <span class="hidden sm:inline">Approve</span>
                      </button>
                      <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <ui-icon name="cancel" class="text-sm" />
                        <span class="hidden sm:inline">Reject</span>
                      </button>
                    } @else if (row.status === 'CONFLICT') {
                      @if (isSuperAdminRole()) {
                        <button type="button" (click)="openEditDetails(row)" [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="edit" class="text-sm" />
                          <span class="hidden sm:inline">Edit</span>
                        </button>
                        <button type="button" (click)="requestDelete(row)" [disabled]="acting() === row.id"
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="delete" class="text-sm" />
                          <span class="hidden sm:inline">Delete</span>
                        </button>
                      }
                      <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <ui-icon name="cancel" class="text-sm" />
                        <span class="hidden sm:inline">Reject</span>
                      </button>
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
                        <button type="button" (click)="openReassign(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="swap_horiz" class="text-sm" />
                          <span class="hidden sm:inline">Change</span>
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
                          class="flex items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">Destination</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden md:table-cell">Dept / Org</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Contact</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden xl:table-cell">Dates / Return</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden lg:table-cell">Passengers</th>
                  <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hidden xl:table-cell">Vehicle / Driver</th>
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

                  <td class="px-4 py-3 max-w-[200px] cursor-pointer hover:bg-gray-50/80 transition-colors" (click)="openDetails(row)">
                    <p class="font-semibold text-gray-900 truncate">{{ row.travelDestination }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDate(row.createdAt) }}</p>
                    <p class="mt-1 text-[10px] font-medium text-primary/80">View full summary</p>
                  </td>

                  <td class="px-4 py-3 hidden md:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.school || 'LPU-L' }} · {{ row.department }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.organization }}</p>
                  </td>

                  <td class="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.contactPerson }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.contactEmail }}</p>
                    <p class="text-xs text-gray-400">{{ row.contactNumber }}</p>
                  </td>

                  <td class="px-4 py-3 hidden xl:table-cell max-w-[180px]">
                    @for (slot of row.parsedSlots; track slot.date) {
                      <div class="text-[11px] leading-tight text-gray-600 flex items-center gap-1 mb-0.5">
                        <ui-icon name="calendar_today" class="text-[10px] text-primary shrink-0" />
                        <span>{{ slot.date }}</span>
                        <span class="text-gray-400">{{ formatSlotTime(slot.startTime, slot.endTime) }}</span>
                      </div>
                    }
                    @if (row.returnTime) {
                      <p class="text-[10px] text-primary mt-0.5">Return: {{ row.returnTime }}</p>
                    }
                  </td>

                  <td class="px-4 py-3 hidden lg:table-cell max-w-[120px]">
                    @if (row.numberOfPassengers) {
                      <p class="text-xs font-medium text-gray-700">{{ row.numberOfPassengers }} passenger{{ row.numberOfPassengers === 1 ? '' : 's' }}</p>
                    }
                    @if (row.passengerNames) {
                      <p class="text-xs text-gray-500 truncate" [title]="row.passengerNames">{{ row.passengerNames }}</p>
                    } @else {
                      <span class="text-xs text-gray-400">—</span>
                    }
                  </td>

                  <td class="px-4 py-3 hidden xl:table-cell max-w-[140px]">
                    @if (row.vehicleLabel) {
                      <p class="text-xs font-medium text-gray-700 truncate">{{ row.vehicleLabel }}</p>
                    } @else {
                      <p class="text-xs text-gray-400 italic">No vehicle</p>
                    }
                    @if (row.driverName) {
                      <p class="text-xs text-gray-500 truncate">{{ row.driverName }}</p>
                    } @else {
                      <p class="text-xs text-gray-400 italic">No assigned driver</p>
                    }
                  </td>

                  <td class="px-4 py-3">
                    <app-reservation-status-pill [status]="row.status" />
                    @if (row.status === 'COMPLETED' && row.satisfactionRating) {
                      <div class="flex items-center gap-0.5 mt-1.5" [title]="row.satisfactionRating + ' / 5'">
                        @for (star of [1,2,3,4,5]; track star) {
                          <span class="text-sm" [class.text-yellow-400]="star <= row.satisfactionRating!" [class.text-gray-300]="star > row.satisfactionRating!">★</span>
                        }
                      </div>
                    }
                  </td>

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
                        <button type="button" (click)="openApprove(row)" [disabled]="acting() === row.id"
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
                          Download Form
                        </button>
                        <button type="button" (click)="openReassign(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="swap_horiz" class="text-sm" />
                          Change Vehicles
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
        <app-dashboard-event-summary-modal
          [event]="event"
          (closed)="closeDetails()"
          (printForm)="printFormFromDetails()"
        />
      }

      @if (confirm()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="confirm.set(null)">
          <div class="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4" (click)="$event.stopPropagation()">
            <div class="flex items-start gap-3">
              @if (confirm()!.action === 'REJECTED') {
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
                  Are you sure you want to mark the trip to
                  <strong>"{{ confirm()!.tripTitle }}"</strong> as <strong class="lowercase">{{ confirm()!.action.toLowerCase() }}</strong>?
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
        serviceName="Van"
        (closed)="exportOpen.set(false)"
        (exported)="runExport($event)"
      />
    }
    @if (approveTarget()) {
      <app-van-approve-modal
        [reservation]="approveTarget()!"
        [mode]="assignMode()"
        (approved)="onAssigned($event)"
        (cancelled)="closeApprove()"
      />
    }

    @if (rescheduleTarget()) {
      <app-van-reschedule-calendar
        [events]="rescheduleApprovedEvents()"
        [initialSlots]="rescheduleInitialSlots()"
        [tripTitle]="rescheduleTarget()!.tripTitle"
        [vehicleSummary]="rescheduleVehicleSummary()"
        [scheduleLoading]="rescheduleScheduleLoading"
        [saving]="rescheduleSaving"
        (saved)="saveReschedule($event)"
        (cancelled)="closeReschedule()"
      />
    }

    @if (editTarget(); as editRow) {
      <app-van-edit-details-modal
        [reservation]="editRow"
        [saving]="editSaving()"
        (saved)="saveEditDetails($event)"
        (cancelled)="closeEditDetails()"
      />
    }
  `,
})
export class VanReservations implements OnInit, OnDestroy {
  private readonly svc = inject(VanReservationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly realtime = inject(ReservationRealtimeService);
  private readonly alerts = inject(ReservationAlertService);
  private readonly auth = inject(AuthService);
  private wsSub?: Subscription;
  private pollSub?: Subscription;

  protected readonly isSuperAdminRole = computed(() => isSuperAdmin(this.auth.user()?.role));

  protected readonly addReservationPath = adminAddReservationPath('van', this.router.url);

  readonly loading = signal(true);
  readonly apiError = signal(false);
  readonly reservations = signal<VanReservationRow[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('PENDING');
  readonly activeMonth = signal(getCurrentYearMonth());
  readonly acting = signal<number | null>(null);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly deleteTarget = signal<{ id: number; eventTitle: string } | null>(null);
  readonly detailsTarget = signal<VanReservationRow | null>(null);
  readonly editTarget = signal<VanReservationRow | null>(null);
  readonly editSaving = signal(false);

  protected readonly detailsSummaryEvent = computed(() => {
    const row = this.detailsTarget();
    if (!row) return null;
    const rec = vanRecordsToDashboardRecords([row])[0];
    return reservationRecordToSummaryEvent(rec, 'VAN');
  });
  readonly approveTarget = signal<VanReservationRow | null>(null);
  readonly assignMode = signal<'approve' | 'reassign'>('approve');
  readonly toast = signal('');
  readonly exportOpen = signal(false);

  readonly rescheduleTarget = signal<{ id: number; tripTitle: string } | null>(null);
  readonly rescheduleSaving = signal(false);
  readonly rescheduleScheduleLoading = signal(false);
  readonly rescheduleVehicleEvents = signal<VanRescheduleEvent[]>([]);
  readonly rescheduleVehicleSummary = signal('');
  private rescheduleScheduleSub: Subscription | null = null;

  readonly rescheduleApprovedEvents = computed<VanRescheduleEvent[]>(() => {
    const target = this.rescheduleTarget();
    const pending: VanRescheduleEvent[] = [];
    for (const r of this.reservations()) {
      if (r.status !== 'PENDING' || r.id === target?.id) continue;
      try {
        const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
        for (const s of slots) {
          pending.push({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            department: r.department,
            organization: r.organization,
            travelDestination: r.travelDestination,
            eventKind: 'PENDING',
            vehicleId: r.vehicleId,
            vehicleLabel: r.vehicleLabel,
          });
        }
      } catch { /* skip */ }
    }
    return [...this.rescheduleVehicleEvents(), ...pending];
  });

  readonly rescheduleInitialSlots = computed<ReservedDateSlot[]>(() => {
    const target = this.rescheduleTarget();
    if (!target) return [];
    const row = this.reservations().find(r => r.id === target.id);
    if (!row) return [];
    try { return JSON.parse(row.reservedDates); } catch { return []; }
  });

  readonly statusChips = computed(() =>
    buildApproverStatusChips(STATUS_FILTERS, this.reservations()),
  );

  readonly filtered = computed((): VanReservationViewRow[] => {
    const q = this.search().toLowerCase().trim();
    const status = this.statusFilter();
    const rows = this.reservations().filter(r => {
      const matchStatus = reservationMatchesStatusFilter(status, r.status);
      const matchSearch = !q
        || r.travelDestination.toLowerCase().includes(q)
        || r.department.toLowerCase().includes(q)
        || r.organization.toLowerCase().includes(q)
        || r.contactPerson.toLowerCase().includes(q)
        || r.contactEmail.toLowerCase().includes(q)
        || (r.passengerNames?.toLowerCase().includes(q) ?? false);
      return matchStatus && matchSearch;
    });
    return sortApproverReservations(rows).map(r => ({
      ...r,
      parsedSlots: parseReservedDatesJson(r.reservedDates) as ReservedDateSlot[],
    }));
  });

  ngOnInit(): void {
    this.applyDashboardQueryParams();
    this.load();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.vanUpdates$.subscribe(ev => this.handleWsEvent(ev));
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
    this.rescheduleScheduleSub?.unsubscribe();
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
          this.alerts.watchPending('VAN', rows);
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
        exportVanReservationsCsv(res.reservations ?? [], range);
        this.exportOpen.set(false);
        this.toast.set('Van reservations exported to CSV');
      },
      error: () => {
        this.toast.set('Failed to export reservations');
      },
    });
  }

  openApprove(row: VanReservationRow): void {
    this.assignMode.set('approve');
    this.approveTarget.set(row);
  }

  openReassign(row: VanReservationRow): void {
    this.assignMode.set('reassign');
    this.approveTarget.set(row);
  }


  // ─── Delete event (Super Admin) ─────────────────────────────────
  requestDelete(row: { id: number; travelDestination: string }): void {
    if (!this.isSuperAdminRole()) return;
    this.deleteTarget.set({ id: row.id, eventTitle: row.travelDestination });
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

  openEditDetails(row: VanReservationRow): void {
    if (!this.isSuperAdminRole()) return;
    this.editTarget.set(row);
  }

  closeEditDetails(): void {
    this.editTarget.set(null);
    this.editSaving.set(false);
  }

  saveEditDetails(body: VanReservationDetailsEditRequest): void {
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
                    school: body.school,
                    department: body.department,
                    organization: body.organization,
                    travelDestination: body.travelDestination,
                    passengerNames: body.passengerNames,
                    numberOfPassengers: body.numberOfPassengers,
                    contactPerson: body.contactPerson,
                    contactEmail: body.contactEmail,
                    contactNumber: body.contactNumber,
                    additionalRemarks: body.additionalRemarks,
                    requestedVehicleType: body.requestedVehicleType,
                  }
                : r,
            ),
          );
          this.toast.set('Trip details updated.');
          this.closeEditDetails();
        } else {
          this.toast.set(res.message || 'Failed to update trip details.');
        }
      },
      error: (err) => {
        this.editSaving.set(false);
        this.toast.set(err?.error?.message ?? 'Failed to update trip details.');
      },
    });
  }

  closeApprove(): void {
    this.approveTarget.set(null);
  }

  onAssigned(result: VanApproveResult): void {
    const target = this.approveTarget();
    if (!target) return;
    this.reservations.update(list => list.map(r => r.id === target.id
      ? {
        ...r,
        status: 'APPROVED' as ReservationStatus,
        vehicleId: result.vehicleIds[0] ?? null,
        vehicleIds: result.vehicleIds,
        vehicleLabel: result.vehicleLabel,
        driverName: result.driverName === '—' ? null : result.driverName,
      }
      : r));
    this.toast.set(
      this.assignMode() === 'reassign'
        ? 'Assigned vehicle(s) updated successfully.'
        : 'Reservation approved. The reserver was notified to visit the office and sign the vehicle reservation form.',
    );
    this.closeApprove();
  }

  requestConfirm(row: VanReservationRow, action: ReservationStatus): void {
    this.confirm.set({ id: row.id, action, tripTitle: row.travelDestination });
  }

  openDetails(row: VanReservationRow): void { this.detailsTarget.set(row); }
  closeDetails(): void { this.detailsTarget.set(null); }

  async printForm(row: VanReservationRow): Promise<void> {
    try {
      await downloadVanReservationForm(row);
    } catch {
      this.toast.set('Failed to generate the vehicle reservation form. Please try again.');
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

  openReschedule(row: VanReservationRow): void {
    this.rescheduleTarget.set({ id: row.id, tripTitle: row.travelDestination });
    this.loadRescheduleVehicleSchedules(row);
  }

  closeReschedule(): void {
    this.rescheduleScheduleSub?.unsubscribe();
    this.rescheduleScheduleSub = null;
    this.rescheduleTarget.set(null);
    this.rescheduleVehicleEvents.set([]);
    this.rescheduleVehicleSummary.set('');
    this.rescheduleScheduleLoading.set(false);
  }

  private loadRescheduleVehicleSchedules(row: VanReservationRow): void {
    this.rescheduleScheduleSub?.unsubscribe();
    const vehicleIds = (row.vehicleIds?.length
      ? row.vehicleIds
      : row.vehicleId != null
        ? [row.vehicleId]
        : []
    ).filter((id, index, all) => id != null && all.indexOf(id) === index) as number[];

    if (!vehicleIds.length) {
      this.rescheduleVehicleEvents.set([]);
      this.rescheduleVehicleSummary.set('');
      this.rescheduleScheduleLoading.set(false);
      return;
    }

    const nameParts = (row.vehicleLabel ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const labelFor = (id: number, index: number) =>
      nameParts[index] || nameParts[0] || `Vehicle #${id}`;

    this.rescheduleScheduleLoading.set(true);
    this.rescheduleVehicleEvents.set([]);
    this.rescheduleVehicleSummary.set(vehicleIds.map((id, i) => labelFor(id, i)).join(', '));

    this.rescheduleScheduleSub = forkJoin(
      vehicleIds.map(id => this.svc.getVehicleSchedule(id, row.id)),
    ).subscribe({
      next: (responses) => {
        const events: VanRescheduleEvent[] = [];
        responses.forEach((res, index) => {
          const vehicleId = vehicleIds[index];
          const label = labelFor(vehicleId, index);
          for (const ev of res.approvedEvents ?? []) {
            events.push({
              date: ev.date,
              startTime: ev.startTime,
              endTime: ev.endTime,
              department: ev.department,
              organization: ev.organization,
              travelDestination: ev.travelDestination,
              eventKind: 'RESERVATION',
              vehicleId,
              vehicleLabel: label,
            });
          }
        });
        this.rescheduleVehicleEvents.set(events);
        this.rescheduleScheduleLoading.set(false);
      },
      error: () => {
        this.rescheduleVehicleEvents.set([]);
        this.rescheduleScheduleLoading.set(false);
        this.toast.set('Failed to load assigned vehicle schedule(s).');
      },
    });
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
          this.toast.set(res.blockedReason ?? res.message ?? 'Failed to reschedule reservation.');
        }
      },
      error: (err) => {
        this.rescheduleSaving.set(false);
        const body = err?.error;
        this.toast.set(body?.blockedReason ?? body?.message ?? 'An error occurred.');
      },
    });
  }

  actionLabel(action: ReservationStatus | string): string {
    const map: Record<string, string> = {
      REJECTED: 'Reject', CANCELLED: 'Cancel', COMPLETED: 'Mark as Complete',
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
