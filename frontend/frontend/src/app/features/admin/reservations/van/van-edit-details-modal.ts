import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { DEPARTMENT_SELECT_OPTIONS } from '../../../../shared/constants/department-options';
import { VAN_SCHOOL_OPTIONS } from '../../../../shared/constants/van-school-options';
import { UiIcon, UiInput, UiLabel, UiSelect } from '../../../../shared/ui';
import {
  VanReservationDetailsEditRequest,
  VanReservationRow,
} from './van-reservations.models';

@Component({
  selector: 'app-van-edit-details-modal',
  imports: [ReactiveFormsModule, UiIcon, UiInput, UiLabel, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="cancelled.emit()">
      <div
        class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl flex flex-col"
        (click)="$event.stopPropagation()"
      >
        <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4 rounded-t-2xl">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wide text-primary">Super Admin</p>
            <h2 class="text-base font-bold text-gray-900">Edit Trip Details</h2>
          </div>
          <button type="button" (click)="cancelled.emit()" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer">
            <ui-icon name="close" class="text-xl" />
          </button>
        </div>

        <form class="flex flex-col gap-4 px-5 py-4" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="travelDestination">Travel Destination <span class="text-red-500">*</span></label>
              <input uiInput id="travelDestination" formControlName="travelDestination" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="school">School <span class="text-red-500">*</span></label>
              <ui-select id="school" formControlName="school" placeholder="Select school" [options]="schoolOptions" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="department">Department <span class="text-red-500">*</span></label>
              <ui-select id="department" formControlName="department" placeholder="Select department" [options]="departmentOptions" [searchable]="true" />
            </div>
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="organization">Organization <span class="text-red-500">*</span></label>
              <input uiInput id="organization" formControlName="organization" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="contactPerson">Contact Person <span class="text-red-500">*</span></label>
              <input uiInput id="contactPerson" formControlName="contactPerson" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="contactNumber">Contact Number <span class="text-red-500">*</span></label>
              <input uiInput id="contactNumber" formControlName="contactNumber" />
            </div>
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="contactEmail">Contact Email <span class="text-red-500">*</span></label>
              <input uiInput id="contactEmail" type="email" formControlName="contactEmail" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="numberOfPassengers">Number of Passengers <span class="text-red-500">*</span></label>
              <input uiInput id="numberOfPassengers" type="number" min="1" formControlName="numberOfPassengers" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="requestedVehicleType">Requested Vehicle Type</label>
              <input uiInput id="requestedVehicleType" formControlName="requestedVehicleType" placeholder="Optional" />
            </div>
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="passengerNames">Passenger Names <span class="text-red-500">*</span></label>
              <textarea
                id="passengerNames"
                formControlName="passengerNames"
                rows="3"
                class="w-full rounded-lg border border-zinc-950/15 bg-white/70 px-3 py-2 text-sm text-gray-900 focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none"
              ></textarea>
            </div>
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="additionalRemarks">Additional Remarks</label>
              <textarea
                id="additionalRemarks"
                formControlName="additionalRemarks"
                rows="2"
                class="w-full rounded-lg border border-zinc-950/15 bg-white/70 px-3 py-2 text-sm text-gray-900 focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none"
              ></textarea>
            </div>
          </div>

          @if (error()) {
            <p class="text-sm text-red-600 flex items-center gap-1.5">
              <ui-icon name="warning" class="text-base" />{{ error() }}
            </p>
          }

          <div class="flex gap-2 justify-end border-t border-gray-100 pt-4">
            <button type="button" (click)="cancelled.emit()" class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || saving()"
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (saving()) {
                <ui-icon name="autorenew" class="text-base animate-spin" />
              } @else {
                <ui-icon name="save" class="text-base" />
              }
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class VanEditDetailsModal {
  readonly reservation = input.required<VanReservationRow>();
  readonly saving = input(false);
  readonly saved = output<VanReservationDetailsEditRequest>();
  readonly cancelled = output<void>();

  readonly error = signal('');
  readonly departmentOptions = DEPARTMENT_SELECT_OPTIONS;
  readonly schoolOptions = [...VAN_SCHOOL_OPTIONS];

  readonly form = new FormGroup({
    school: new FormControl('LPU-L', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    organization: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    travelDestination: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passengerNames: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    numberOfPassengers: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    contactPerson: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    contactNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    additionalRemarks: new FormControl('', { nonNullable: true }),
    requestedVehicleType: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const row = this.reservation();
      this.error.set('');
      const passengers = Number(row.numberOfPassengers ?? 1);
      this.form.patchValue({
        school: row.school || 'LPU-L',
        department: row.department ?? '',
        organization: row.organization ?? '',
        travelDestination: row.travelDestination ?? '',
        passengerNames: row.passengerNames ?? '',
        numberOfPassengers: Number.isFinite(passengers) && passengers > 0 ? passengers : 1,
        contactPerson: row.contactPerson ?? '',
        contactEmail: row.contactEmail ?? '',
        contactNumber: row.contactNumber ?? '',
        additionalRemarks: row.additionalRemarks ?? '',
        requestedVehicleType: row.requestedVehicleType ?? '',
      });
    });
  }

  submit(): void {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please fill in all required fields.');
      return;
    }
    const v = this.form.getRawValue();
    this.saved.emit({
      school: v.school,
      department: v.department,
      organization: v.organization.trim(),
      travelDestination: v.travelDestination.trim(),
      passengerNames: v.passengerNames.trim(),
      numberOfPassengers: v.numberOfPassengers,
      contactPerson: v.contactPerson.trim(),
      contactEmail: v.contactEmail.trim(),
      contactNumber: v.contactNumber.trim(),
      additionalRemarks: v.additionalRemarks.trim() || null,
      requestedVehicleType: v.requestedVehicleType.trim() || null,
    });
  }
}
