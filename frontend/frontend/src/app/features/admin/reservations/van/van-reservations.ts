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
import { VanRescheduleCalendar, VanRescheduleEvent } from './van-reschedule-calendar';
import { VanApproveModal, VanApproveResult } from './van-approve-modal';
import { UiButton, UiIcon, UiInputSearch, UiSelect, UiSelectOption, UiToast, UiDateSelector } from '../../../../shared/ui';
import { getCurrentYearMonth, reservationRecordToSummaryEvent, vanRecordsToDashboardRecords } from '../../dashboard/dashboard-events.util';
import { formatReadableDateTime, formatTime12 } from '../../../../shared/utils/datetime.util';
import { DashboardEventSummaryModal } from '../../dashboard/dashboard-event-summary-modal';
import { parseStatusFilterParam, reservationMatchesStatusFilter } from '../reservation-filter.util';
import {
  ReservationStatus,
  ReservedDateSlot,
  VanReservationRow,
} from './van-reservations.models';
import { VanReservationsService } from './van-reservations.service';
import { ReservationRealtimeService, ReservationWsEvent } from '../reservation-realtime.service';
import { applyRevertedIds, applyReservationWsEvent } from '../reservation-ws.util';
import { ReservationExportModal } from '../reservation-export-modal';
import { exportVanReservationsCsv, ExportDateRange } from '../reservation-export.util';
import { adminAddReservationPath } from '../admin-reservation-path.util';
import { ApprovedReservationActionsMenu } from '../approved-reservation-actions-menu';
import { ReservationApproverTableSkeleton } from '../reservation-approver-table-skeleton';
import { ReservationApproverMobileSkeleton } from '../reservation-approver-mobile-skeleton';
import { downloadVanReservationForm } from './van-reservation-form-export.util';

const STATUS_FILTERS = ['All', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface ConfirmState {
  id: number;
  action: ReservationStatus;
  tripTitle: string;
}

@Component({
  selector: 'app-van-reservations',
  imports: [ RouterLink, UiButton, UiIcon, UiInputSearch, UiSelect, UiToast, UiDateSelector, VanRescheduleCalendar, VanApproveModal, ReservationExportModal, ApprovedReservationActionsMenu, ReservationApproverTableSkeleton, ReservationApproverMobileSkeleton, DashboardEventSummaryModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-none flex-col gap-4 md:min-h-0 md:flex-1' },
  template: `
    <section class="animate-rise flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-black text-gray-900">University Van Reservations</h1>
          <p class="text-sm text-gray-500 mt-0.5">Review, assign vehicles/drivers, and manage van trip requests</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a uiButton [routerLink]="addReservationPath">
            <ui-icon name="add" class="text-base" />
            <span class="hidden sm:inline">Add Reservation</span>
          </a>
          <button type="button" (click)="exportOpen.set(true)"
            class="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
            <ui-icon name="download" class="text-base" />
            <span class="hidden sm:inline">Export</span>
          </button>
          <div class="flex items-center gap-2 text-sm text-gray-500">
          <ui-icon name="airport_shuttle" class="text-primary text-base" />
          <span class="hidden xs:inline sm:inline">{{ filtered().length }} of {{ reservations().length }} shown</span>
          <span class="sm:hidden">{{ filtered().length }}/{{ reservations().length }}</span>
        </div>
        </div>
      </section>

      <section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ui-select
          class="w-full sm:w-44 shrink-0"
          [value]="statusFilter()"
          (valueChange)="statusFilter.set($any($event))"
          placeholder="Filter by status"
          [options]="statusFilterOptions"
        />
        @if (!allMonths()) {
          <ui-date-selector [value]="activeMonth()" (valueChange)="onMonthChange($event)" />
        }
        <button
          type="button"
          (click)="toggleAllMonths()"
          class="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer"
          [class.border-primary]="allMonths()"
          [class.bg-primary]="allMonths()"
          [class.text-white]="allMonths()"
          [class.border-gray-200]="!allMonths()"
          [class.text-gray-600]="!allMonths()"
        >
          <ui-icon name="calendar_month" class="text-sm" />
          {{ allMonths() ? 'Filter by month' : 'All months' }}
        </button>
        <ui-input-search
          placeholder="Search by destination, department, contact, passengers..."
          (valueChange)="search.set($event)"
          class="w-full min-w-0 sm:min-w-48 sm:flex-1"
        />
      </section>

      <section class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] animate-rise flex flex-col rounded-xl max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-hidden">
        @if (apiError()) {
          <div class="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <ui-icon name="cloud_off" class="text-5xl text-red-300" />
            <p class="text-sm font-semibold text-red-500">Failed to load reservations</p>
            <button type="button" (click)="load()"
              class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors cursor-pointer mt-1">
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
                        <p class="font-semibold text-gray-900">{{ row.travelDestination }}</p>
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
                    @if (row.additionalRemarks) {
                      <p class="mt-1 text-[10px] italic text-amber-600 truncate" [title]="row.additionalRemarks">📝 {{ row.additionalRemarks }}</p>
                    }
                    @if (row.vehicleLabel || row.driverName) {
                      <p class="mt-1 text-[10px] text-gray-500 truncate">{{ row.vehicleLabel || 'No vehicle' }} · {{ row.driverName || 'No driver' }}</p>
                    }
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    @if (row.status === 'PENDING') {
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
                      <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                        class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                <tr class="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td class="px-4 py-3 text-xs text-gray-400 font-mono">{{ row.id }}</td>

                  <td class="px-4 py-3 max-w-[200px] cursor-pointer hover:bg-gray-50/80 transition-colors" (click)="openDetails(row)">
                    <p class="font-semibold text-gray-900 truncate">{{ row.travelDestination }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5">{{ formatDate(row.createdAt) }}</p>
                    <p class="mt-1 text-[10px] font-semibold text-primary">Click to view full summary</p>
                  </td>

                  <td class="px-4 py-3 hidden md:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.department }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.organization }}</p>
                  </td>

                  <td class="px-4 py-3 hidden lg:table-cell max-w-[160px]">
                    <p class="text-xs font-medium text-gray-700 truncate">{{ row.contactPerson }}</p>
                    <p class="text-xs text-gray-400 truncate">{{ row.contactEmail }}</p>
                    <p class="text-xs text-gray-400">{{ row.contactNumber }}</p>
                  </td>

                  <td class="px-4 py-3 hidden xl:table-cell max-w-[180px]">
                    @for (slot of parseDates(row.reservedDates); track slot.date) {
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
                      <p class="text-xs text-gray-400 italic">No driver</p>
                    }
                  </td>

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
                        <button type="button" (click)="requestConfirm(row, 'REJECTED')" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
                        <button type="button" (click)="printForm(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="download" class="text-sm" />
                          Download Form
                        </button>
                        <button type="button" (click)="openReassign(row)" [disabled]="acting() === row.id"
                          class="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                          <ui-icon name="swap_horiz" class="text-sm" />
                          Change Vehicle/Driver
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
        [saving]="rescheduleSaving"
        (saved)="saveReschedule($event)"
        (cancelled)="closeReschedule()"
      />
    }
  `,
})
export class VanReservations implements OnInit, OnDestroy {
  private readonly svc = inject(VanReservationsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly realtime = inject(ReservationRealtimeService);
  private wsSub?: Subscription;

  protected readonly addReservationPath = adminAddReservationPath('van', this.router.url);

  readonly loading = signal(true);
  readonly apiError = signal(false);
  readonly reservations = signal<VanReservationRow[]>([]);
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('PENDING');
  readonly activeMonth = signal(getCurrentYearMonth());
  readonly allMonths = signal(false);
  readonly acting = signal<number | null>(null);
  readonly confirm = signal<ConfirmState | null>(null);
  readonly detailsTarget = signal<VanReservationRow | null>(null);

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

  readonly rescheduleTarget = signal<{ id: number; tripTitle: string } | null>(null);
  readonly rescheduleSaving = signal(false);

  readonly rescheduleApprovedEvents = computed<VanRescheduleEvent[]>(() => {
    const target = this.rescheduleTarget();
    const events: VanRescheduleEvent[] = [];
    for (const r of this.reservations()) {
      if (r.status !== 'APPROVED' && r.status !== 'COMPLETED') continue;
      if (r.id === target?.id) continue;
      try {
        const slots: ReservedDateSlot[] = JSON.parse(r.reservedDates);
        for (const s of slots) {
          events.push({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            department: r.department,
            organization: r.organization,
            travelDestination: r.travelDestination,
            eventKind: 'RESERVATION',
          });
        }
      } catch { /* skip */ }
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

  readonly statusFilterOptions: UiSelectOption[] = STATUS_FILTERS.map((s) => ({ value: s, label: s }));

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
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
    return [...rows].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  });

  ngOnInit(): void {
    this.applyDashboardQueryParams();
    this.load();
    this.realtime.ensureConnected();
    this.wsSub = this.realtime.vanUpdates$.subscribe(ev => this.handleWsEvent(ev));
  }

  private applyDashboardQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const status = parseStatusFilterParam(params.get('status'), STATUS_FILTERS);
    if (status) this.statusFilter.set(status as StatusFilter);
    const month = params.get('month');
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      this.activeMonth.set(month);
      this.allMonths.set(false);
    }
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  onMonthChange(month: string): void {
    this.activeMonth.set(month);
    this.load();
  }

  toggleAllMonths(): void {
    this.allMonths.update((v) => !v);
    this.load();
  }

  private listMonthParam(): string | undefined {
    return this.allMonths() ? undefined : this.activeMonth();
  }

  load(): void {
    this.loading.set(true);
    this.apiError.set(false);
    this.svc.getAll(this.listMonthParam()).subscribe({
      next: (res) => {
        if (res.success) {
          this.reservations.set(res.reservations ?? []);
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
    this.svc.getAll().subscribe({
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
        vehicleId: result.vehicleId,
        driverId: result.driverId,
        vehicleLabel: result.vehicleLabel,
        driverName: result.driverName,
      }
      : r));
    this.toast.set(
      this.assignMode() === 'reassign'
        ? 'Vehicle and driver updated successfully.'
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
      this.load();
      return;
    }
    this.reservations.set(updated);
  }

  parseDates(json: string): ReservedDateSlot[] {
    try { return JSON.parse(json) ?? []; } catch { return []; }
  }

  formatDate(iso: string): string {
    return formatReadableDateTime(iso);
  }

  formatSlotTime(start: string, end: string): string {
    return `${formatTime12(start)}–${formatTime12(end)}`;
  }
}
