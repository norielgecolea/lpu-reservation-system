import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { forkJoin } from 'rxjs';
import { UiIcon } from '../../../../shared/ui';
import { formatTime12 } from '../../../../shared/utils/datetime.util';
import {
  ReservedDateSlot,
  VanApprovedScheduleEvent,
  VanReservationRow,
  VanVehicleItem,
  vehicleLabel,
} from './van-reservations.models';
import { VanReservationsService } from './van-reservations.service';

export interface VanApproveResult {
  vehicleIds: number[];
  vehicleLabel: string;
  driverName: string;
}

type ApproveStep = 1 | 2 | 3;
type AssignMode = 'approve' | 'reassign';

interface ScheduleCell {
  day: number | null;
  dateStr: string | null;
  isToday: boolean;
  vehicleEvents: VanApprovedScheduleEvent[];
  requested: ReservedDateSlot[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Component({
  selector: 'app-van-approve-modal',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="cancelled.emit()">
      <div class="flex max-h-[90vh] w-full max-w-full sm:max-w-3xl flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl" (click)="$event.stopPropagation()">

        <div class="shrink-0 border-b border-gray-100 px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-gray-900">{{ modalTitle() }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                #{{ reservation.id }} · {{ reservation.travelDestination }}
              </p>
            </div>
            <button type="button" (click)="cancelled.emit()"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer">
              <ui-icon name="close" class="text-lg" />
            </button>
          </div>

          <div class="flex items-center gap-2 mt-4">
            @for (s of [1,2,3]; track s) {
              <div class="flex items-center gap-2 flex-1">
                <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors"
                  [class.bg-primary]="step() >= s"
                  [class.text-white]="step() >= s"
                  [class.bg-gray-200]="step() < s"
                  [class.text-gray-500]="step() < s"
                >{{ s }}</div>
                @if (s < 3) {
                  <div class="h-0.5 flex-1 rounded transition-colors"
                    [class.bg-primary]="step() > s"
                    [class.bg-gray-200]="step() <= s"
                  ></div>
                }
              </div>
            }
          </div>
          <div class="grid grid-cols-3 gap-1 mt-1.5 text-[10px] text-gray-400 text-center">
            <span>Vehicles</span>
            <span>Schedule</span>
            <span>Confirm</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">

          @if (loadingMeta()) {
            <div class="flex items-center justify-center gap-2 py-12 text-gray-400">
              <ui-icon name="autorenew" class="text-2xl animate-spin" />
              <span class="text-sm">Loading resources...</span>
            </div>
          } @else if (metaError()) {
            <div class="flex flex-col items-center gap-3 py-12 text-center">
              <ui-icon name="cloud_off" class="text-4xl text-red-300" />
              <p class="text-sm text-red-500">{{ metaError() }}</p>
              <button type="button" (click)="loadMeta()"
                class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white cursor-pointer">Retry</button>
            </div>
          } @else {

            @if (step() === 1) {
              <div class="flex flex-col gap-3">
                <p class="text-sm font-semibold text-gray-700">Select one or more available vehicles</p>
                @if (vehicles().length === 0) {
                  <p class="text-sm text-amber-600 flex items-center gap-1.5">
                    <ui-icon name="warning" class="text-base" />
                    No vehicles are available for the requested time slots. Reschedule the reservation or check vehicle status.
                  </p>
                } @else {
                  <div class="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    @for (v of vehicles(); track v.id) {
                      <label class="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors"
                        [class.border-primary]="isVehicleSelected(v.id)"
                        [class.bg-primary/5]="isVehicleSelected(v.id)"
                        [class.border-gray-200]="!isVehicleSelected(v.id)">
                        <input type="checkbox" class="mt-1 accent-primary"
                          [checked]="isVehicleSelected(v.id)"
                          (change)="toggleVehicle(v.id, $event)" />
                        <div class="min-w-0 flex-1">
                          <p class="font-bold text-gray-800">{{ vehicleLabel(v) }}</p>
                          <p class="text-xs text-primary mt-0.5">{{ v.vehicleDescription || 'No description' }}</p>
                          <p class="text-xs text-primary/70 mt-0.5">Capacity: {{ v.capacity }} passengers</p>
                          @if (v.assignedDriverName) {
                            <p class="text-xs text-gray-500 mt-1">
                              Driver: {{ v.assignedDriverName }}
                              @if (v.assignedDriverContact) {
                                · {{ v.assignedDriverContact }}
                              }
                            </p>
                          } @else {
                            <p class="text-xs text-amber-600 mt-1">No permanent driver set on this vehicle</p>
                          }
                        </div>
                      </label>
                    }
                  </div>
                }
                @if (selectedVehicles().length > 0) {
                  <p class="text-xs text-gray-500">{{ selectedVehicles().length }} vehicle(s) selected</p>
                }
              </div>
            }

            @if (step() === 2) {
              <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-gray-700">
                    Vehicle schedule vs requested slots
                  </p>
                  @if (loadingSchedule()) {
                    <ui-icon name="autorenew" class="text-base animate-spin text-gray-400" />
                  }
                </div>

                @if (vehicleConflict()) {
                  <div class="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 flex items-start gap-2">
                    <ui-icon name="warning" class="text-base shrink-0 mt-0.5" />
                    <span>Requested time slots overlap with one or more selected vehicles' existing trips. Choose different vehicles.</span>
                  </div>
                } @else {
                  <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                    <ui-icon name="check_circle" class="text-base" />
                    No schedule conflicts detected for the selected vehicle(s).
                  </div>
                }

                <div class="rounded-xl border border-gray-200 p-3">
                  <p class="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Requested Trip Slots</p>
                  @for (slot of requestedSlots(); track slot.date + slot.startTime) {
                    <p class="text-sm text-gray-700">• {{ slot.date }} · {{ slot.startTime }} – {{ slot.endTime }}</p>
                  }
                  @if (reservation.returnTime) {
                    <p class="text-xs text-primary mt-1">Return by: {{ reservation.returnTime }}</p>
                  }
                </div>

                <div class="rounded-xl overflow-hidden ring-1 ring-black/5">
                  <div class="flex items-center justify-between bg-gray-50 px-4 py-2">
                    <button type="button" (click)="prevMonth()" class="cursor-pointer p-1 hover:text-primary">
                      <ui-icon name="chevron_left" />
                    </button>
                    <span class="text-sm font-bold text-gray-700">{{ monthLabel() }}</span>
                    <button type="button" (click)="nextMonth()" class="cursor-pointer p-1 hover:text-primary">
                      <ui-icon name="chevron_right" />
                    </button>
                  </div>
                  <div class="grid grid-cols-7 bg-primary text-center text-xs font-bold text-white">
                    @for (wd of weekdays; track wd) {
                      <div class="py-1.5">{{ wd }}</div>
                    }
                  </div>
                  <div class="grid grid-cols-7">
                    @for (cell of scheduleCells(); track $index) {
                      <div class="min-h-14 border-r border-b border-gray-100 bg-white p-1"
                        [class.bg-gray-50]="cell.day === null"
                        [class.bg-emerald-50]="cell.requested.length > 0"
                      >
                        @if (cell.day !== null) {
                          <span class="text-[10px] font-semibold text-gray-600">{{ cell.day }}</span>
                          @for (ev of cell.vehicleEvents.slice(0, 2); track ev.date + ev.startTime + ev.travelDestination + (ev.vehicleId ?? 0)) {
                            <div class="mt-0.5 rounded border-l-2 border-sky-500 bg-sky-100 px-0.5 text-[9px] leading-tight truncate text-sky-700" [title]="ev.travelDestination">
                              {{ formatTime(ev.startTime) }}–{{ formatTime(ev.endTime) }} · {{ ev.department }}
                            </div>
                          }
                          @if (cell.requested.length > 0) {
                            <div class="mt-0.5 rounded border-l-2 border-emerald-500 bg-emerald-100 px-0.5 text-[9px] leading-tight text-emerald-700">
                              Requested
                            </div>
                          }
                        }
                      </div>
                    }
                  </div>
                </div>

                <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span class="flex items-center gap-1"><span class="w-3 h-3 rounded border-l-2 border-sky-500 bg-sky-100"></span> Vehicle trip</span>
                  <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-100 border-l-2 border-emerald-500"></span> Requested slot</span>
                </div>
              </div>
            }

            @if (step() === 3) {
              <div class="flex flex-col gap-4">
                <p class="text-sm font-semibold text-gray-700">{{ confirmStepTitle() }}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div class="rounded-xl border border-gray-200 p-3">
                    <p class="text-xs uppercase font-bold text-gray-400">Destination</p>
                    <p class="font-semibold text-gray-900 mt-1">{{ reservation.travelDestination }}</p>
                  </div>
                  <div class="rounded-xl border border-gray-200 p-3">
                    <p class="text-xs uppercase font-bold text-gray-400">Passengers</p>
                    @if (reservation.numberOfPassengers) {
                      <p class="text-xs text-gray-500 mt-1">{{ reservation.numberOfPassengers }} passenger{{ reservation.numberOfPassengers === 1 ? '' : 's' }}</p>
                    }
                    <p class="font-semibold text-gray-900 mt-1">{{ reservation.passengerNames || '—' }}</p>
                  </div>
                </div>
                <div class="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p class="text-xs uppercase font-bold text-primary/70 mb-2">Assigned Vehicle(s)</p>
                  @for (v of selectedVehicles(); track v.id) {
                    <div class="mb-2 last:mb-0">
                      <p class="font-semibold text-gray-900">{{ vehicleLabel(v) }}</p>
                      <p class="text-xs text-gray-600 mt-0.5">
                        Driver: {{ v.assignedDriverName || '—' }}
                        @if (v.assignedDriverContact) {
                          · {{ v.assignedDriverContact }}
                        }
                      </p>
                    </div>
                  }
                </div>
                <div class="rounded-xl border border-gray-200 p-3">
                  <p class="text-xs uppercase font-bold text-gray-400 mb-2">Trip Schedule</p>
                  @for (slot of requestedSlots(); track slot.date + slot.startTime) {
                    <p class="text-sm text-gray-700">• {{ slot.date }} · {{ slot.startTime }} – {{ slot.endTime }}</p>
                  }
                </div>
                @if (submitError()) {
                  <p class="text-sm text-red-500 flex items-center gap-1.5">
                    <ui-icon name="warning" class="text-base" />{{ submitError() }}
                  </p>
                }
              </div>
            }
          }
        </div>

        <div class="shrink-0 border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
          <button type="button" (click)="step() === 1 ? cancelled.emit() : prevStep()"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
            {{ step() === 1 ? 'Cancel' : 'Back' }}
          </button>
          <div class="flex gap-2">
            @if (step() < 3) {
              <button type="button" (click)="nextStep()" [disabled]="!canProceed()"
                class="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                Next
              </button>
            } @else {
              <button type="button" (click)="submit()" [disabled]="submitting() || vehicleConflict()"
                class="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                @if (submitting()) { <ui-icon name="autorenew" class="text-base animate-spin" /> }
                @else { <ui-icon name="check_circle" class="text-base" /> }
                Confirm {{ mode() === 'reassign' ? 'Change' : 'Approve' }}
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VanApproveModal implements OnInit {
  private readonly svc = inject(VanReservationsService);

  @Input({ required: true }) reservation!: VanReservationRow;
  readonly mode = input<AssignMode>('approve');
  @Output() approved = new EventEmitter<VanApproveResult>();
  @Output() cancelled = new EventEmitter<void>();

  readonly modalTitle = computed(() =>
    this.mode() === 'reassign' ? 'Change Assigned Vehicles' : 'Approve Van Reservation',
  );

  readonly confirmStepTitle = computed(() =>
    this.mode() === 'reassign'
      ? 'Review and confirm assignment change'
      : 'Review and confirm approval',
  );

  readonly step = signal<ApproveStep>(1);
  readonly vehicles = signal<VanVehicleItem[]>([]);
  readonly selectedVehicleIds = signal<number[]>([]);
  readonly vehicleSchedule = signal<VanApprovedScheduleEvent[]>([]);

  readonly loadingMeta = signal(true);
  readonly metaError = signal('');
  readonly loadingSchedule = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');

  readonly activeYear = signal(new Date().getFullYear());
  readonly activeMonth = signal(new Date().getMonth());

  readonly weekdays = WEEKDAYS;
  readonly vehicleLabel = vehicleLabel;

  readonly requestedSlots = computed<ReservedDateSlot[]>(() => {
    try { return JSON.parse(this.reservation.reservedDates) ?? []; } catch { return []; }
  });

  readonly selectedVehicles = computed(() => {
    const ids = new Set(this.selectedVehicleIds());
    return this.vehicles().filter(v => ids.has(v.id));
  });

  readonly selectedVehicleLabel = computed(() =>
    this.selectedVehicles().map(v => vehicleLabel(v)).join(', ') || '—',
  );

  readonly selectedDriverName = computed(() => {
    const names = this.selectedVehicles()
      .map(v => v.assignedDriverName?.trim())
      .filter((n): n is string => !!n);
    return names.length ? names.join(', ') : '—';
  });

  readonly vehicleConflict = computed(() =>
    this.slotsOverlapSchedule(this.requestedSlots(), this.vehicleSchedule()),
  );

  readonly monthLabel = computed(() => {
    const d = new Date(this.activeYear(), this.activeMonth(), 1);
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  readonly scheduleCells = computed<ScheduleCell[]>(() => {
    const year = this.activeYear();
    const month = this.activeMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.fmt(today);
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.max(5, Math.ceil((firstWeekday + daysInMonth) / 7)) * 7;
    const schedule = this.vehicleSchedule();
    const requested = this.requestedSlots();

    return Array.from({ length: cellCount }, (_, i) => {
      const dayOffset = i - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInMonth) {
        return { day: null, dateStr: null, isToday: false, vehicleEvents: [], requested: [] };
      }
      const day = dayOffset + 1;
      const dateStr = this.fmt(new Date(year, month, day));
      return {
        day,
        dateStr,
        isToday: dateStr === todayStr,
        vehicleEvents: schedule.filter(e => e.date === dateStr),
        requested: requested.filter(s => s.date === dateStr),
      };
    });
  });

  ngOnInit(): void {
    this.loadMeta();
    const firstSlot = this.requestedSlots()[0];
    if (firstSlot?.date) {
      const [y, m] = firstSlot.date.split('-').map(Number);
      this.activeYear.set(y);
      this.activeMonth.set(m - 1);
    }
  }

  loadMeta(): void {
    this.loadingMeta.set(true);
    this.metaError.set('');
    this.svc.getAvailableVehiclesForReservation(this.reservation.id).subscribe({
      next: (vRes) => {
        this.loadingMeta.set(false);
        if (!vRes.success) {
          this.metaError.set(vRes.message ?? 'Failed to load vehicles');
          return;
        }
        this.vehicles.set(vRes.vehicles ?? []);
        this.prefillSelections();
      },
      error: () => { this.loadingMeta.set(false); this.metaError.set('Failed to load vehicles'); },
    });
  }

  private prefillSelections(): void {
    if (this.mode() !== 'reassign') return;
    const fromList = this.reservation.vehicleIds?.filter(id =>
      this.vehicles().some(v => v.id === id),
    ) ?? [];
    if (fromList.length) {
      this.selectedVehicleIds.set(fromList);
      return;
    }
    const single = this.reservation.vehicleId;
    if (single && this.vehicles().some(v => v.id === single)) {
      this.selectedVehicleIds.set([single]);
    }
  }

  isVehicleSelected(id: number): boolean {
    return this.selectedVehicleIds().includes(id);
  }

  toggleVehicle(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedVehicleIds.update(ids => {
      if (checked) {
        return ids.includes(id) ? ids : [...ids, id];
      }
      return ids.filter(x => x !== id);
    });
    this.vehicleSchedule.set([]);
  }

  loadSchedules(vehicleIds: number[]): void {
    if (!vehicleIds.length) {
      this.vehicleSchedule.set([]);
      return;
    }
    this.loadingSchedule.set(true);
    forkJoin(
      vehicleIds.map(id => this.svc.getVehicleSchedule(id, this.reservation.id)),
    ).subscribe({
      next: (responses) => {
        this.loadingSchedule.set(false);
        const events = responses.flatMap(r => r.approvedEvents ?? []);
        this.vehicleSchedule.set(events);
      },
      error: () => { this.loadingSchedule.set(false); this.vehicleSchedule.set([]); },
    });
  }

  canProceed(): boolean {
    switch (this.step()) {
      case 1: return this.selectedVehicleIds().length > 0;
      case 2: return !this.loadingSchedule() && !this.vehicleConflict();
      default: return true;
    }
  }

  nextStep(): void {
    const current = this.step();
    if (current === 1 && this.selectedVehicleIds().length) {
      this.step.set(2);
      this.loadSchedules(this.selectedVehicleIds());
      return;
    }
    if (current < 3) this.step.set((current + 1) as ApproveStep);
  }

  prevStep(): void {
    const current = this.step();
    if (current > 1) this.step.set((current - 1) as ApproveStep);
  }

  formatTime(value: string | null | undefined): string {
    if (!value) return '—';
    return formatTime12(value.includes(':') ? value : `${String(this.parseHour(value)).padStart(2, '0')}:00`);
  }

  prevMonth(): void {
    if (this.activeMonth() === 0) { this.activeMonth.set(11); this.activeYear.update(y => y - 1); }
    else { this.activeMonth.update(m => m - 1); }
  }

  nextMonth(): void {
    if (this.activeMonth() === 11) { this.activeMonth.set(0); this.activeYear.update(y => y + 1); }
    else { this.activeMonth.update(m => m + 1); }
  }

  submit(): void {
    const vehicleIds = this.selectedVehicleIds();
    if (!vehicleIds.length) return;
    if (this.vehicleConflict()) return;

    this.submitting.set(true);
    this.submitError.set('');
    const body = { vehicleIds };
    const req$ = this.mode() === 'reassign'
      ? this.svc.reassign(this.reservation.id, body)
      : this.svc.approve(this.reservation.id, body);
    req$.subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.approved.emit({
            vehicleIds,
            vehicleLabel: this.selectedVehicleLabel(),
            driverName: this.selectedDriverName(),
          });
        } else {
          this.submitError.set(res.blockedReason ?? res.message ?? 'Assignment failed.');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const body = err?.error;
        this.submitError.set(body?.blockedReason ?? body?.message ?? 'An error occurred.');
      },
    });
  }

  private slotsOverlapSchedule(
    requested: ReservedDateSlot[],
    schedule: VanApprovedScheduleEvent[],
  ): boolean {
    for (const req of requested) {
      for (const ev of schedule) {
        if (req.date !== ev.date) continue;
        const aStart = this.parseHour(req.startTime);
        const aEnd = this.parseHour(req.endTime);
        const bStart = this.parseHour(ev.startTime);
        const bEnd = this.parseHour(ev.endTime);
        if (aStart < bEnd && aEnd > bStart) return true;
      }
    }
    return false;
  }

  private parseHour(value: string): number {
    if (!value) return NaN;
    const colon = value.indexOf(':');
    if (colon >= 0) return parseInt(value.slice(0, colon), 10);
    return parseInt(value, 10);
  }

  private fmt(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
