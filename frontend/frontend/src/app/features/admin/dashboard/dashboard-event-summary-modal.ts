import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { UiIcon } from '../../../shared/ui';
import {
  DashboardEvent,
  formatReadableDate,
  formatReadableTime,
  getRoomTypeLabel,
} from './dashboard-events.util';

@Component({
  selector: 'app-dashboard-event-summary-modal',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      (click)="closed.emit()"
    >
      <div
        class="animate-rise flex max-h-[90vh] w-full max-w-2xl cursor-default flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div
          class="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 p-5"
        >
          <div class="min-w-0">
            @if (event().eventKind === 'maintenance') {
              <h3 class="text-lg font-bold text-gray-900">Maintenance Block</h3>
              <p class="mt-0.5 text-xs text-gray-500">
                Block #{{ event().reservationId }} · {{ event().facility }}
              </p>
            } @else {
              <h3 class="text-lg font-bold text-gray-900">
                @if (event().facility === 'VAN') {
                  {{ event().travelDestination || event().eventTitle }}
                } @else {
                  {{ event().eventTitle }}
                }
              </h3>
              <p class="mt-0.5 text-xs text-gray-500">
                Reservation #{{ event().reservationId }} · {{ event().status }} · {{ event().facility }}
                @if (event().eventKind === 'coordination') {
                  · Coordination meeting
                }
              </p>
            }
          </div>
          <button
            type="button"
            class="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            (click)="closed.emit()"
          >
            <ui-icon name="close" class="text-xl" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          @if (event().eventKind === 'maintenance') {
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Maintenance Schedule</p>
              <p class="mt-1 text-sm font-semibold text-primary">{{ formatDate(event().date) }}</p>
              <p class="text-sm text-gray-700">{{ event().time }}</p>
              @if (event().maintenanceReason) {
                <p class="mt-3 text-sm text-gray-700">{{ event().maintenanceReason }}</p>
              }
            </div>
          } @else if (event().facility === 'VAN') {
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Trip</p>
                <p class="mt-1 font-semibold text-gray-900">
                  {{ event().travelDestination || event().eventTitle }}
                </p>
                <p class="text-xs text-gray-500">{{ event().department }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Organization</p>
                <p class="mt-1 font-semibold text-gray-900">{{ event().organization }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Contact</p>
                <p class="mt-1 font-semibold text-gray-900">{{ event().contactPerson }}</p>
                <p class="text-xs text-gray-500">{{ event().contactEmail }}</p>
                @if (event().contactNumber) {
                  <p class="text-xs text-gray-500">{{ event().contactNumber }}</p>
                }
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Passengers</p>
                <p class="mt-1 font-semibold text-gray-900">
                  {{ event().numberOfPassengers ?? '—' }} pax
                </p>
                @if (event().passengerNames) {
                  <p class="text-xs text-gray-500 whitespace-pre-wrap">{{ event().passengerNames }}</p>
                }
              </div>
              <div class="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-primary">Vehicle</p>
                <p class="mt-1 font-semibold text-gray-900">
                  {{ event().vehicleLabel || 'Unassigned' }}
                </p>
              </div>
              <div class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-emerald-600">Driver</p>
                <p class="mt-1 font-semibold text-emerald-900">
                  {{ event().driverName || 'Unassigned' }}
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Selected Trip Slot</p>
              <p class="mt-1 text-sm font-semibold text-primary">{{ formatDate(event().date) }}</p>
              <p class="text-sm text-gray-700">
                Departure {{ event().time }}
                @if (event().returnTime) {
                  · Return {{ formatTime(event().returnTime) }}
                }
              </p>
            </div>

            @if (event().reservedSlots.length > 1) {
              <div class="rounded-xl border border-gray-200 p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">All Reserved Dates</p>
                <div class="space-y-1">
                  @for (slot of event().reservedSlots; track slot.date + slot.startTime) {
                    <p class="text-sm text-gray-700">
                      • {{ formatDate(slot.date) }} · {{ slot.time }}
                    </p>
                  }
                </div>
              </div>
            }

            <div class="rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Additional Remarks</p>
              @if (event().additionalInstructions?.trim()) {
                <p class="text-sm whitespace-pre-wrap text-gray-700">{{ event().additionalInstructions }}</p>
              } @else {
                <p class="text-sm text-gray-500">None provided</p>
              }
            </div>
          } @else {
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Event</p>
                <p class="mt-1 font-semibold text-gray-900">{{ event().eventTitle }}</p>
                @if (event().eventType) {
                  <p class="text-xs capitalize text-gray-500">{{ event().eventType }}</p>
                }
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Organization</p>
                <p class="mt-1 font-semibold text-gray-900">{{ event().organization }}</p>
                <p class="text-xs text-gray-500">{{ event().department }}</p>
              </div>
              <div class="rounded-xl border border-gray-200 p-3">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Contact</p>
                <p class="mt-1 font-semibold text-gray-900">{{ event().contactPerson }}</p>
                <p class="text-xs text-gray-500">{{ event().contactEmail }}</p>
                @if (event().contactNumber) {
                  <p class="text-xs text-gray-500">{{ event().contactNumber }}</p>
                }
              </div>
              @if (event().roomType || event().expectedAttendees || event().numberOfAttendees) {
                <div class="rounded-xl border border-gray-200 p-3">
                  <p class="text-xs font-bold uppercase tracking-wide text-gray-400">Room / Attendees</p>
                  @if (event().roomType) {
                    <p class="mt-1 font-semibold text-gray-900">
                      {{ roomLabel(event().roomType) }}
                    </p>
                  }
                  <p class="text-xs text-gray-500">
                    {{ event().expectedAttendees || event().numberOfAttendees || '—' }} pax
                  </p>
                </div>
              }
            </div>

            <div class="rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400">
                @if (event().eventKind === 'coordination') {
                  Selected Coordination Slot
                } @else {
                  Selected Schedule Slot
                }
              </p>
              <p class="mt-1 text-sm font-semibold text-primary">{{ formatDate(event().date) }}</p>
              <p class="text-sm text-gray-700">{{ event().time }}</p>
            </div>

            @if (event().reservedSlots.length > 0) {
              <div class="rounded-xl border border-gray-200 p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Reserved Dates</p>
                <div class="space-y-1">
                  @for (slot of event().reservedSlots; track slot.date + slot.startTime) {
                    <p class="text-sm text-gray-700">
                      • {{ formatDate(slot.date) }} · {{ slot.time }}
                    </p>
                  }
                </div>
              </div>
            }

            @if (event().coordinationDate && event().coordinationTime) {
              <div class="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">
                  Coordination Meeting
                </p>
                <p class="text-sm text-amber-900">
                  {{ formatDate(event().coordinationDate) }} · {{ event().coordinationTime }}
                </p>
              </div>
            }

            <div class="rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Requested Equipment</p>
              @if (event().requestedEquipment.length > 0) {
                <div class="flex flex-wrap gap-2">
                  @for (eq of event().requestedEquipment; track eq.id) {
                    <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {{ eq.name }}
                    </span>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-500">None requested</p>
              }
            </div>
          }

          @if (event().eventKind !== 'maintenance' && event().facility !== 'VAN') {
            <div class="rounded-xl border border-gray-200 p-4">
              <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Additional Instructions</p>
              @if (event().additionalInstructions?.trim()) {
                <p class="text-sm whitespace-pre-wrap text-gray-700">
                  {{ event().additionalInstructions }}
                </p>
              } @else {
                <p class="text-sm text-gray-500">None provided</p>
              }
            </div>
          }
        </div>

        @if (event().facility === 'VAN' && event().status === 'APPROVED' && event().eventKind !== 'maintenance') {
          <div class="shrink-0 flex justify-end gap-2 border-t border-gray-100 p-4">
            <button
              type="button"
              class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              (click)="printForm.emit()"
            >
              <ui-icon name="download" class="text-base" />
              Download Form
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardEventSummaryModal {
  readonly event = input.required<DashboardEvent>();
  readonly closed = output<void>();
  readonly printForm = output<void>();

  protected formatDate(value: string | null | undefined): string {
    return formatReadableDate(value);
  }

  protected formatTime(value: string | null | undefined): string {
    return formatReadableTime(value);
  }

  protected roomLabel(value: string | null | undefined): string {
    return getRoomTypeLabel(value);
  }
}
