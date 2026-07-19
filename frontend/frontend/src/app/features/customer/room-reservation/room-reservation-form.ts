import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UiButton, UiCalendar, UiInput, UiLabel, UiIcon } from '../../../shared/ui';
import type { RoomReservationFacility, RoomReservationFeature } from './room-reservation.models';

const DEFAULT_OCCUPIED_DATES = ['2026-06-25', '2026-06-28'];

const DEFAULT_FEATURES: RoomReservationFeature[] = [
  { icon: 'groups', label: 'Scalable Capacity (Up to 20)' },
  { icon: 'language', label: 'Campus Wi-Fi & Fiber Ready' },
];

@Component({
  selector: 'app-room-reservation-form',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput, UiLabel, UiCalendar, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col min-h-screen md:h-screen md:min-h-0 bg-gray-100',
  },
  template: `
    <div
      class="flex-1 w-full flex flex-col md:flex-row relative z-0 h-full min-h-0"
    >
      <div
        class="w-full md:w-1/3 xl:w-1/4 bg-primary bg-[linear-gradient(158deg,#7a2342,#5f1830_42%,#8d2546)] ring-1 ring-inset ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_-1px_0_0_rgba(255,255,255,0.08),0_20px_50px_-22px_rgba(95,24,48,0.6)] p-6 text-white flex flex-col gap-4 relative shrink-0 transition-all duration-300"
      >
        <div class="flex items-center justify-between opacity-90">
          <div class="flex items-center gap-3">
            <img src="/logo.svg" alt="LPU Logo" class="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
            <span class="font-semibold tracking-wide text-xs md:text-sm">LPU LAGUNA RESERVATION SYSTEM</span>
          </div>
          <button 
            type="button" 
            class="md:hidden flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            (click)="isCalendarOpen.set(!isCalendarOpen())"
            [attr.aria-label]="isCalendarOpen() ? 'Hide calendar' : 'Show calendar'"
          >
            <ui-icon [name]="isCalendarOpen() ? 'keyboard_arrow_up' : 'calendar_month'" class="text-xl" />
          </button>
        </div>

        <h1 class="text-4xl md:text-5xl font-black drop-shadow-sm tracking-tight">
          {{ facility.title }}
        </h1>

        <div class="grow rounded-xl bg-white p-4 text-gray-900 shadow-lg ring-1 ring-black/5" [class.max-md:hidden]="!isCalendarOpen()">
          <ui-calendar 
            [occupiedDates]="facility.occupiedDates ?? defaultOccupiedDates"
            (selectionChanged)="onCalendarViewRangeChanged($event)"
          />
        </div>
      </div>

      <div
        class="w-full md:w-2/3 xl:w-3/4 bg-white/40 relative h-full flex flex-col md:overflow-hidden min-h-0"
      >
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col flex-1 w-full min-h-0">
          <div
            class="flex-1 md:overflow-y-auto hidden-scrollbar p-6 pb-2 flex flex-col gap-4 md:gap-6"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 xl:gap-8">
              <div class="flex flex-col gap-2">
                <label uiLabel for="eventName">Event / Seminar Name</label>
                <input uiInput id="eventName" formControlName="eventName" />
              </div>
              <div class="flex flex-col gap-2">
                <label uiLabel for="headcount">Expected Headcount</label>
                <input uiInput id="headcount" type="number" formControlName="headcount" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 xl:gap-8">
              <div class="flex flex-col gap-2">
                <label uiLabel for="contactPerson">Contact Person</label>
                <input uiInput id="contactPerson" formControlName="contactPerson" />
              </div>
              <div class="flex flex-col gap-2">
                <label uiLabel for="contactEmail">Contact Email</label>
                <input uiInput id="contactEmail" type="email" formControlName="contactEmail" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 xl:gap-8">
              <div class="flex flex-col gap-2">
                <label uiLabel for="startDate">Start Date</label>
                <input uiInput id="startDate" type="date" formControlName="startDate" />
              </div>
              <div class="flex flex-col gap-2">
                <label uiLabel for="endDate">End Date</label>
                <input uiInput id="endDate" type="date" formControlName="endDate" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 xl:gap-8">
              <div class="flex flex-col gap-2">
                <label uiLabel for="startTime">Start Time</label>
                <input uiInput id="startTime" type="time" formControlName="startTime" />
              </div>
              <div class="flex flex-col gap-2">
                <label uiLabel for="endTime">End Time</label>
                <input uiInput id="endTime" type="time" formControlName="endTime" />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label uiLabel>Equipment</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                @for (eq of equipmentOptions; track eq) {
                  <button
                    type="button"
                    (click)="toggleEquipment(eq)"
                    class="h-10 rounded-lg border text-sm font-medium transition-all duration-200"
                    [class.border-primary]="hasEquipment(eq)"
                    [class.bg-primary]="hasEquipment(eq)"
                    [class.text-white]="hasEquipment(eq)"
                    [class.border-gray-300]="!hasEquipment(eq)"
                    [class.bg-white]="!hasEquipment(eq)"
                    [class.text-gray-600]="!hasEquipment(eq)"
                    [class.hover:border-primary/50]="!hasEquipment(eq)"
                  >
                    {{ eq }}
                  </button>
                }
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label uiLabel for="remarks">Remarks</label>
              <textarea
                id="remarks"
                formControlName="remarks"
                rows="4"
                class="w-full rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 transition-all duration-200 hover:border-secondary/45 hover:ring-secondary/25 focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <div
            class="shrink-0 p-6 flex gap-4 mt-auto sticky bottom-0 z-20 bg-white/40 md:bg-transparent backdrop-blur-md md:backdrop-blur-none"
          >
            <button
              uiButton
              variant="secondary"
              type="button"
              class="flex-1 bg-white/50 md:bg-transparent"
              routerLink="/customer"
            >
              CANCEL
            </button>
            <button
              uiButton
              variant="primary"
              type="submit"
              class="flex-1"
              [disabled]="form.invalid"
            >
              SUBMIT
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RoomReservationForm {
  @Input({ required: true }) facility: RoomReservationFacility = {
    title: 'Boardroom',
    occupiedDates: DEFAULT_OCCUPIED_DATES,
    features: DEFAULT_FEATURES,
  };

  protected isCalendarOpen = signal(false);

  readonly defaultOccupiedDates = DEFAULT_OCCUPIED_DATES;

  readonly equipmentOptions = [
    'Projector',
    'Microphone',
    'Speaker System',
    'Whiteboard',
    'Laptop',
    'Video Conf.',
  ];

  readonly selectedEquipment = signal<string[]>([]);

  readonly form = new FormGroup({
    eventName: new FormControl('', Validators.required),
    headcount: new FormControl('', Validators.required),
    contactPerson: new FormControl('', Validators.required),
    contactEmail: new FormControl('', [Validators.required, Validators.email]),
    startDate: new FormControl('', Validators.required),
    startTime: new FormControl('', Validators.required),
    endDate: new FormControl('', Validators.required),
    endTime: new FormControl('', Validators.required),
    remarks: new FormControl(''),
  });

  get features(): RoomReservationFeature[] {
    return this.facility.features?.length ? this.facility.features : DEFAULT_FEATURES;
  }

  onCalendarViewRangeChanged(range: {startDate?: string, endDate?: string, startTime?: string, endTime?: string}): void {
    const patch: any = {};
    if (range.startDate !== undefined) patch.startDate = range.startDate;
    if (range.endDate !== undefined) patch.endDate = range.endDate;
    if (range.startTime !== undefined) patch.startTime = range.startTime;
    if (range.endTime !== undefined) patch.endTime = range.endTime;
    
    this.form.patchValue(patch);
  }

  hasEquipment(eq: string): boolean {
    return this.selectedEquipment().includes(eq);
  }

  toggleEquipment(eq: string): void {
    this.selectedEquipment.update((curr) =>
      curr.includes(eq) ? curr.filter((e) => e !== eq) : [...curr, eq],
    );
  }

  submit(): void {
    if (this.form.invalid) return;

    const payload = {
      facility: this.facility.title,
      ...this.form.value,
      equipment: this.selectedEquipment(),
    };

    console.log('Submitted Reservation:', payload);
    // TODO: implement API call
    alert('Reservation submitted successfully!');
  }
}
