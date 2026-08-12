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
import { UiIcon, UiInput, UiLabel, UiSelect } from '../../../../shared/ui';
import {
  NexusReservationDetailsEditRequest,
  NexusReservationRecord,
  RequestedEquipmentItem,
} from './nexus-reservations.models';

@Component({
  selector: 'app-nexus-edit-details-modal',
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
            <h2 class="text-base font-bold text-gray-900">Edit Event Details</h2>
          </div>
          <button type="button" (click)="cancelled.emit()" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer">
            <ui-icon name="close" class="text-xl" />
          </button>
        </div>

        <form class="flex flex-col gap-4 px-5 py-4" [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="eventTitle">Event Title <span class="text-red-500">*</span></label>
              <input uiInput id="eventTitle" formControlName="eventTitle" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label uiLabel for="department">Department <span class="text-red-500">*</span></label>
              <ui-select id="department" formControlName="department" placeholder="Select department" [options]="departmentOptions" [searchable]="true" />
            </div>
            <div class="flex flex-col gap-1.5">
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
              <label uiLabel for="numberOfAttendees">Number of Attendees <span class="text-red-500">*</span></label>
              <input uiInput id="numberOfAttendees" type="number" min="1" formControlName="numberOfAttendees" />
            </div>
            <div class="sm:col-span-2 flex flex-col gap-1.5">
              <label uiLabel for="additionalInstructions">Additional Instructions</label>
              <textarea
                id="additionalInstructions"
                formControlName="additionalInstructions"
                rows="3"
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
export class NexusEditDetailsModal {
  readonly reservation = input.required<NexusReservationRecord>();
  readonly saving = input(false);
  readonly saved = output<NexusReservationDetailsEditRequest>();
  readonly cancelled = output<void>();

  readonly error = signal('');
  readonly departmentOptions = DEPARTMENT_SELECT_OPTIONS;

  readonly form = new FormGroup({
    eventTitle: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    department: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    organization: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactPerson: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    contactNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    numberOfAttendees: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    additionalInstructions: new FormControl('', { nonNullable: true }),
  });

  private equipment: RequestedEquipmentItem[] = [];

  constructor() {
    effect(() => {
      const row = this.reservation();
      this.error.set('');
      const attendees = Number.parseInt(String(row.numberOfAttendees ?? '1'), 10);
      this.form.patchValue({
        eventTitle: row.eventTitle ?? '',
        department: row.department ?? '',
        organization: row.organization ?? '',
        contactPerson: row.contactPerson ?? '',
        contactEmail: row.contactEmail ?? '',
        contactNumber: row.contactNumber ?? '',
        numberOfAttendees: Number.isFinite(attendees) && attendees > 0 ? attendees : 1,
        additionalInstructions: row.additionalInstructions ?? '',
      });
      try {
        this.equipment = row.requestedEquipment ? JSON.parse(row.requestedEquipment) : [];
      } catch {
        this.equipment = [];
      }
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
      eventTitle: v.eventTitle.trim(),
      department: v.department,
      organization: v.organization.trim(),
      contactPerson: v.contactPerson.trim(),
      contactEmail: v.contactEmail.trim(),
      contactNumber: v.contactNumber.trim(),
      numberOfAttendees: v.numberOfAttendees,
      additionalInstructions: v.additionalInstructions.trim() || null,
      requestedEquipment: this.equipment,
    });
  }
}
