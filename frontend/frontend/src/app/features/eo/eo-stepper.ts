import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { UiButton, UiCheckbox, UiIcon, UiInput, UiLabel, UiSelect } from '../../shared/ui';
import { DEPARTMENT_SELECT_OPTIONS } from '../../shared/constants/department-options';
import { UNIVERSITY_EMAIL_DOMAINS_LABEL, isUniversityEmail } from '../../shared/constants/lpu-email';
import { formatTime12 } from '../../shared/utils/datetime.util';
import { philippinePhoneValidator } from '../../shared/utils/ph-phone.util';
import { EoReservationsService } from './eo-reservations.service';
import {
  EoReservePayload,
  EoReservedDateSlot,
  EoRoomType,
  eoRoomLabel,
} from './eo-reservations.models';

@Component({
  selector: 'app-eo-stepper',
  imports: [ReactiveFormsModule, UiButton, UiCheckbox, UiIcon, UiInput, UiLabel, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  template: `
    <div class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div class="mb-6 flex items-center gap-0">
        @for (step of steps; track step.id; let i = $index) {
          <div class="flex items-center" [class.flex-1]="i < steps.length - 1">
            <div class="flex flex-col items-center gap-1">
              <div
                class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 shrink-0"
                [class.bg-primary]="currentStep() >= step.id"
                [class.text-white]="currentStep() >= step.id"
                [class.bg-gray-200]="currentStep() < step.id"
                [class.text-gray-500]="currentStep() < step.id"
              >
                @if (currentStep() > step.id) {
                  <ui-icon name="check" class="text-base" />
                } @else {
                  {{ step.id }}
                }
              </div>
              <span
                class="hidden text-[10px] font-semibold tracking-wide whitespace-nowrap sm:block"
                [class.text-primary]="currentStep() >= step.id"
                [class.text-gray-400]="currentStep() < step.id"
              >{{ step.label }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div
                class="mx-2 mt-[-12px] h-0.5 flex-1 sm:mt-[-20px]"
                [class.bg-primary]="currentStep() > step.id"
                [class.bg-gray-200]="currentStep() <= step.id"
              ></div>
            }
          </div>
        }
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto pb-4" style="scrollbar-width: thin">
        @if (currentStep() === 2) {
          <div class="flex flex-col gap-4">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Reservation details</h2>
              <p class="mt-0.5 text-sm text-gray-500">
                {{ eoRoomLabel(roomType()) }} · {{ dateSlots().length }} date(s) selected
              </p>
            </div>
            <div [formGroup]="detailsForm" class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <label uiLabel for="agenda">Agenda <span class="text-red-500">*</span></label>
                <input uiInput id="agenda" formControlName="agenda" placeholder="e.g. Executive committee meeting" />
                @if (detailsForm.get('agenda')?.invalid && detailsForm.get('agenda')?.touched) {
                  <p class="text-xs text-red-500">Agenda is required.</p>
                }
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div class="flex flex-col gap-2">
                  <label uiLabel for="department">Department <span class="text-red-500">*</span></label>
                  <ui-select
                    id="department"
                    formControlName="department"
                    placeholder="Select department"
                    [options]="departmentOptions"
                    [searchable]="true"
                  />
                  @if (detailsForm.get('department')?.invalid && detailsForm.get('department')?.touched) {
                    <p class="text-xs text-red-500">Department is required.</p>
                  }
                </div>
                <div class="flex flex-col gap-2">
                  <label uiLabel for="organization">Organization <span class="text-red-500">*</span></label>
                  <input uiInput id="organization" formControlName="organization" placeholder="e.g. Executive Office" />
                  @if (detailsForm.get('organization')?.invalid && detailsForm.get('organization')?.touched) {
                    <p class="text-xs text-red-500">Organization is required.</p>
                  }
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label uiLabel for="notes">Notes</label>
                <textarea
                  id="notes"
                  formControlName="notes"
                  rows="4"
                  placeholder="Optional notes for this booking"
                  class="w-full rounded-lg border border-zinc-950/15 bg-white/70 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary/55 focus:ring-2 focus:ring-primary/35 focus:outline-none"
                ></textarea>
              </div>
            </div>
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Selected dates</p>
              <ul class="flex flex-col gap-1.5 text-sm text-gray-700">
                @for (slot of dateSlots(); track slot.date) {
                  <li>{{ formatDateDisplay(slot.date) }} · {{ formatTimeDisplay(slot.startTime) }} – {{ formatTimeDisplay(slot.endTime) }}</li>
                }
              </ul>
            </div>
          </div>
        }

        @if (currentStep() === 3) {
          <div class="flex flex-col gap-4">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Contact information</h2>
              <p class="mt-0.5 text-sm text-gray-500">Optional. If encoded, we will email this person about the reservation.</p>
            </div>
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <input
                type="checkbox"
                uiCheckbox
                class="mt-0.5"
                [checked]="skipContact()"
                (change)="onSkipChange($event)"
              />
              <span>
                <span class="block text-sm font-semibold text-gray-900">I don’t need to encode contact info</span>
                <span class="mt-0.5 block text-xs text-gray-500">No confirmation email will be sent.</span>
              </span>
            </label>
            @if (!skipContact()) {
              <div [formGroup]="contactForm" class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <label uiLabel for="contactPerson">Contact Person <span class="text-red-500">*</span></label>
                  <input uiInput id="contactPerson" formControlName="contactPerson" placeholder="Full name" />
                  @if (contactForm.get('contactPerson')?.invalid && contactForm.get('contactPerson')?.touched) {
                    <p class="text-xs text-red-500">Contact person is required.</p>
                  }
                </div>
                <div class="flex flex-col gap-2">
                  <label uiLabel for="contactEmail">Contact Email <span class="text-red-500">*</span></label>
                  <input uiInput id="contactEmail" type="email" formControlName="contactEmail" placeholder="name@lpulaguna.edu.ph" />
                  @if (contactForm.get('contactEmail')?.invalid && contactForm.get('contactEmail')?.touched) {
                    <p class="text-xs text-red-500">
                      @if (contactForm.get('contactEmail')?.errors?.['required']) { Email is required. }
                      @if (contactForm.get('contactEmail')?.errors?.['email']) { Please enter a valid email address. }
                      @if (contactForm.get('contactEmail')?.errors?.['lpuDomain']) { Only {{ universityEmailHint }} addresses are allowed. }
                    </p>
                  }
                </div>
                <div class="flex flex-col gap-2">
                  <label uiLabel for="contactNumber">Contact Number <span class="text-red-500">*</span></label>
                  <input uiInput id="contactNumber" type="tel" formControlName="contactNumber" placeholder="e.g. 09171234567" />
                  @if (contactForm.get('contactNumber')?.invalid && contactForm.get('contactNumber')?.touched) {
                    <p class="text-xs text-red-500">Enter a valid Philippine phone number.</p>
                  }
                </div>
              </div>
            }
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Summary</p>
              <p><span class="font-medium">Room:</span> {{ eoRoomLabel(roomType()) }}</p>
              <p><span class="font-medium">Agenda:</span> {{ detailsForm.get('agenda')?.value || '—' }}</p>
              <p><span class="font-medium">Department:</span> {{ detailsForm.get('department')?.value || '—' }}</p>
              <p><span class="font-medium">Organization:</span> {{ detailsForm.get('organization')?.value || '—' }}</p>
            </div>
          </div>
        }
      </div>

      @if (submitError()) {
        <p class="mb-3 flex items-center gap-1.5 text-sm text-red-500">
          <ui-icon name="warning" class="text-base" />
          {{ submitError() }}
        </p>
      }

      <div class="flex shrink-0 gap-3 border-t border-gray-100 pt-4">
        <button type="button" uiButton variant="secondary" class="flex-1" (click)="prevStep()">
          <ui-icon name="arrow_back" class="text-base" />
          Back
        </button>
        @if (currentStep() === 2) {
          <button type="button" uiButton class="flex-1" (click)="nextStep()">
            Continue
            <ui-icon name="arrow_forward" class="text-base" />
          </button>
        } @else {
          <button type="button" uiButton class="flex-1" [disabled]="submitting()" (click)="submit()">
            {{ submitting() ? 'Saving…' : 'Save reservation' }}
          </button>
        }
      </div>
    </div>
  `,
})
export class EoStepper implements OnChanges {
  private readonly api = inject(EoReservationsService);

  readonly roomType = input.required<EoRoomType>();
  readonly selectedDates = input<EoReservedDateSlot[]>([]);
  readonly cancelled = output<void>();
  readonly saved = output<void>();

  protected readonly eoRoomLabel = eoRoomLabel;
  protected readonly universityEmailHint = UNIVERSITY_EMAIL_DOMAINS_LABEL;
  protected readonly departmentOptions = DEPARTMENT_SELECT_OPTIONS;
  protected readonly steps = [
    { id: 1, label: 'DATES & TIMES' },
    { id: 2, label: 'DETAILS' },
    { id: 3, label: 'CONTACT' },
  ];

  protected readonly currentStep = signal(2);
  protected readonly skipContact = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal('');
  protected readonly dateSlots = signal<EoReservedDateSlot[]>([]);

  protected readonly detailsForm = new FormGroup({
    agenda: new FormControl('', Validators.required),
    department: new FormControl('', Validators.required),
    organization: new FormControl('', Validators.required),
    notes: new FormControl(''),
  });

  protected readonly contactForm = new FormGroup({
    contactPerson: new FormControl(''),
    contactEmail: new FormControl(''),
    contactNumber: new FormControl(''),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDates']) {
      this.dateSlots.set((this.selectedDates() ?? []).map((s) => ({ ...s })));
    }
  }

  protected onSkipChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.skipContact.set(checked);
    this.applyContactValidators(!checked);
  }

  protected nextStep(): void {
    this.detailsForm.markAllAsTouched();
    if (!this.detailsForm.valid) return;
    this.currentStep.set(3);
  }

  protected prevStep(): void {
    this.submitError.set('');
    if (this.currentStep() === 3) {
      this.currentStep.set(2);
      return;
    }
    this.cancelled.emit();
  }

  protected submit(): void {
    this.detailsForm.markAllAsTouched();
    if (!this.detailsForm.valid || this.dateSlots().length === 0) return;
    if (!this.skipContact()) {
      this.contactForm.markAllAsTouched();
      if (!this.contactForm.valid) return;
    }

    const payload: EoReservePayload = {
      roomType: this.roomType(),
      agenda: this.detailsForm.value.agenda!.trim(),
      department: this.detailsForm.value.department!,
      organization: this.detailsForm.value.organization!.trim(),
      notes: this.detailsForm.value.notes?.trim() || null,
      skipContact: this.skipContact(),
      reservedDates: this.dateSlots(),
    };
    if (!this.skipContact()) {
      payload.contactPerson = this.contactForm.value.contactPerson!.trim();
      payload.contactEmail = this.contactForm.value.contactEmail!.trim().toLowerCase();
      payload.contactNumber = this.contactForm.value.contactNumber!.trim();
    }

    this.submitting.set(true);
    this.submitError.set('');
    this.api.reserve(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.saved.emit();
        } else {
          this.submitError.set(res.message || 'Failed to save reservation');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected formatDateDisplay(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected formatTimeDisplay(timeStr: string): string {
    return formatTime12(timeStr);
  }

  private applyContactValidators(required: boolean): void {
    const person = this.contactForm.controls.contactPerson;
    const email = this.contactForm.controls.contactEmail;
    const number = this.contactForm.controls.contactNumber;
    if (required) {
      person.setValidators(Validators.required);
      email.setValidators([
        Validators.required,
        Validators.email,
        (control) => (isUniversityEmail(control.value ?? '') ? null : { lpuDomain: true }),
      ]);
      number.setValidators([Validators.required, philippinePhoneValidator]);
    } else {
      person.clearValidators();
      email.clearValidators();
      number.clearValidators();
    }
    person.updateValueAndValidity();
    email.updateValueAndValidity();
    number.updateValueAndValidity();
  }
}
