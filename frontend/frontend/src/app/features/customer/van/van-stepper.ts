import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostBinding,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UiButton, UiInput, UiLabel, UiIcon, UiSelect } from '../../../shared/ui';
import { VAN_DEPARTMENT_SELECT_OPTIONS } from '../../../shared/constants/van-department-options';
import { VAN_SCHOOL_OPTIONS } from '../../../shared/constants/van-school-options';
import { LPU_LAGUNA_EMAIL_DOMAIN, isLpuLagunaEmail } from '../../../shared/constants/lpu-email';
import { AllowedEmailsService } from '../../admin/allowed-emails/allowed-emails.service';
import { VanReservationPayload, ReservedDateSlot } from './van-reservation.models';
import { VanReservationService } from './van-reservation.service';
import { ReservationSubmittedModal } from '../reservation-submitted-modal';
import { ReservationOtpModal } from '../reservation-otp-modal';
import { formatTime12 } from '../../../shared/utils/datetime.util';
import { philippinePhoneValidator } from '../../../shared/utils/ph-phone.util';

@Component({
  selector: 'app-van-stepper',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput, UiLabel, UiIcon, UiSelect, ReservationSubmittedModal, ReservationOtpModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col',
  },
  template: `
    <!-- Step indicator -->
    <div class="shrink-0 px-6 pt-6 pb-4">
      <div class="flex items-center gap-0">
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
                class="text-[10px] font-semibold tracking-wide whitespace-nowrap hidden sm:block"
                [class.text-primary]="currentStep() >= step.id"
                [class.text-gray-400]="currentStep() < step.id"
              >{{ step.label }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div class="flex-1 h-0.5 mx-2 mt-[-12px] sm:mt-[-20px] transition-all duration-300"
                [class.bg-primary]="currentStep() > step.id"
                [class.bg-gray-200]="currentStep() <= step.id"
              ></div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Step content -->
    <div
      class="px-6 pb-2 flex flex-col gap-4 md:gap-5"
      [class.flex-1]="!adminMode"
      [class.min-h-0]="!adminMode"
      [class.md:overflow-y-auto]="!adminMode"
      [style.scrollbar-width]="!adminMode ? 'thin' : null"
    >

      <!-- Step 1: Dates & Times -->
      @if (currentStep() === 1) {
        <div class="flex flex-col gap-4 animate-fade-in">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-bold text-gray-900">Your Selected Dates</h2>
              <p class="text-sm text-gray-500 mt-0.5">Review your departure and return times. You can adjust or remove them.</p>
            </div>
           
          </div>

          @if (dateSlots().length === 0) {
            <div class="flex flex-col items-center justify-center gap-3 py-10 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <ui-icon name="calendar_month" class="text-4xl text-gray-300" />
              <div>
                <p class="text-sm font-semibold text-gray-500">No dates selected</p>
                <p class="text-xs text-gray-400 mt-1">Go back to the calendar to pick your dates</p>
              </div>
              <button
                type="button"
                (click)="addMoreDates.emit()"
                class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer"
              >
                <ui-icon name="calendar_month" class="text-base" />
                Go to Calendar
              </button>
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (slot of dateSlots(); track slot.date) {
                <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <ui-icon name="event" class="text-primary text-base" />
                      </div>
                      <span class="font-semibold text-sm text-gray-900">{{ formatDateDisplay(slot.date) }}</span>
                    </div>
                    <button
                      type="button"
                      (click)="removeDateSlot(slot.date)"
                      class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <ui-icon name="close" class="text-base" />
                    </button>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div class="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
                      <ui-icon name="flight_takeoff" class="text-primary text-base shrink-0" />
                      <div>
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-400">Departure</span>
                        <span class="block font-semibold text-gray-700">{{ formatTimeDisplay(slot.startTime) }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
                      <ui-icon name="flight_land" class="text-primary text-base shrink-0" />
                      <div>
                        <span class="text-[10px] font-bold uppercase tracking-wide text-gray-400">Return</span>
                        <span class="block font-semibold text-gray-700">{{ formatTimeDisplay(slot.endTime) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Step 2: Trip Details -->
      @if (currentStep() === 2) {
        <div class="flex flex-col gap-4 animate-fade-in">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Trip Details</h2>
            <p class="text-sm text-gray-500 mt-0.5">Fill in the Vehicle Reservation Form (VRF) details for your trip.</p>
          </div>

          <div [formGroup]="detailsForm" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label uiLabel for="school">School <span class="text-red-500">*</span></label>
                <ui-select
                  id="school"
                  formControlName="school"
                  placeholder="Select school"
                  [options]="schoolOptions"
                />
                @if (detailsForm.get('school')?.invalid && detailsForm.get('school')?.touched) {
                  <p class="text-xs text-red-500">School is required.</p>
                }
              </div>

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
                <input uiInput id="organization" formControlName="organization" placeholder="e.g. Student Council" />
                @if (detailsForm.get('organization')?.invalid && detailsForm.get('organization')?.touched) {
                  <p class="text-xs text-red-500">Organization is required.</p>
                }
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="travelDestination">Destination <span class="text-red-500">*</span></label>
                <input uiInput id="travelDestination" formControlName="travelDestination" placeholder="e.g. Manila City Hall" />
                @if (detailsForm.get('travelDestination')?.invalid && detailsForm.get('travelDestination')?.touched) {
                  <p class="text-xs text-red-500">Destination is required.</p>
                }
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="numberOfPassengers">Number of Passengers <span class="text-red-500">*</span></label>
                <input
                  uiInput
                  id="numberOfPassengers"
                  type="number"
                  min="1"
                  formControlName="numberOfPassengers"
                  placeholder="e.g. 5"
                />
                @if (detailsForm.get('numberOfPassengers')?.invalid && detailsForm.get('numberOfPassengers')?.touched) {
                  <p class="text-xs text-red-500">Enter at least 1 passenger.</p>
                }
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="passengerNames">Name of Passenger(s) <span class="text-red-500">*</span></label>
                <p class="text-xs text-gray-500 -mt-1">List all passengers, one per line. Only listed passengers may ride.</p>
                <textarea
                  id="passengerNames"
                  formControlName="passengerNames"
                  rows="4"
                  placeholder="Juan Dela Cruz&#10;Maria Santos&#10;..."
                  class="w-full rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/55 transition-all duration-200 resize-none"
                ></textarea>
                @if (detailsForm.get('passengerNames')?.invalid && detailsForm.get('passengerNames')?.touched) {
                  <p class="text-xs text-red-500">Passenger names are required.</p>
                }
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="requestedVehicleType">Requested Vehicle Type <span class="text-xs font-normal text-gray-400">(optional)</span></label>
                <input
                  uiInput
                  id="requestedVehicleType"
                  formControlName="requestedVehicleType"
                  placeholder="e.g. Van, Coaster, SUV"
                />
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="additionalRemarks">Remarks <span class="text-xs font-normal text-gray-400">(optional)</span></label>
                <textarea
                  id="additionalRemarks"
                  formControlName="additionalRemarks"
                  rows="3"
                  placeholder="Any special requests or notes for the FMO..."
                  class="w-full rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/55 transition-all duration-200 resize-none"
                ></textarea>
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="returnTime">Date and Time of Return</label>
                <input
                  uiInput
                  id="returnTime"
                  formControlName="returnTime"
                  readonly
                  class="bg-gray-50 cursor-not-allowed"
                />
                <p class="text-xs text-gray-400">Taken from your selected return time on the calendar.</p>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Step 3: Contact Info + Review -->
      @if (currentStep() === 3) {
        <div class="flex flex-col gap-4 animate-fade-in">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Contact Information</h2>
            <p class="text-sm text-gray-500 mt-0.5">Provide your contact details. We'll use these for reservation updates.</p>
          </div>

          <div [formGroup]="contactForm" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label uiLabel for="contactPerson">Contact Person <span class="text-red-500">*</span></label>
              <input uiInput id="contactPerson" formControlName="contactPerson" placeholder="Full name" />
              @if (contactForm.get('contactPerson')?.invalid && contactForm.get('contactPerson')?.touched) {
                <p class="text-xs text-red-500">Contact person name is required.</p>
              }
            </div>
            <div class="flex flex-col gap-2">
              <label uiLabel for="contactEmail">Contact Email <span class="text-red-500">*</span></label>
              <input uiInput id="contactEmail" type="email" formControlName="contactEmail" placeholder="name@lpulaguna.edu.ph" />
              @if (contactForm.get('contactEmail')?.invalid && contactForm.get('contactEmail')?.touched) {
                <p class="text-xs text-red-500">
                  @if (contactForm.get('contactEmail')?.errors?.['required']) { Email is required. }
                  @if (contactForm.get('contactEmail')?.errors?.['email']) { Please enter a valid email address. }
                  @if (contactForm.get('contactEmail')?.errors?.['lpuDomain']) { Only {{ lpuEmailDomain }} addresses are allowed. }
                </p>
              }
            </div>
            <div class="flex flex-col gap-2">
              <label uiLabel for="contactNumber">Contact Number <span class="text-red-500">*</span></label>
              <input uiInput id="contactNumber" type="tel" formControlName="contactNumber" placeholder="e.g. 09171234567" />
              @if (contactForm.get('contactNumber')?.invalid && (contactForm.get('contactNumber')?.touched || contactForm.get('contactNumber')?.dirty)) {
                <p class="text-xs text-red-500">
                  @if (contactForm.get('contactNumber')?.errors?.['required']) { Contact number is required. }
                  @if (contactForm.get('contactNumber')?.errors?.['phPhone']) { Enter a valid Philippine phone number (e.g. 09171234567). }
                </p>
              }
            </div>
          </div>

          <!-- Reservation summary -->
          <div class="mt-2 rounded-xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-3">
            <h3 class="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ui-icon name="summarize" class="text-base text-primary" />
              Reservation Summary
            </h3>
            <div class="flex flex-col gap-1.5 text-sm text-gray-600">
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">School:</span> {{ detailsForm.get('school')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Destination:</span> {{ detailsForm.get('travelDestination')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Department:</span> {{ detailsForm.get('department')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Organization:</span> {{ detailsForm.get('organization')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Return Time:</span> {{ detailsForm.get('returnTime')?.value || '—' }}</div>
              <div class="flex gap-2 flex-wrap">
                <span class="font-medium text-gray-800 min-w-28">Dates:</span>
                <span>
                  @for (slot of dateSlots(); track slot.date; let last = $last) {
                    {{ formatDateDisplay(slot.date) }} (Dep {{ formatTimeDisplay(slot.startTime) }} – Ret {{ formatTimeDisplay(slot.endTime) }}){{ !last ? ', ' : '' }}
                  }
                </span>
              </div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Passengers:</span> {{ detailsForm.get('numberOfPassengers')?.value || '—' }}</div>
              @if (detailsForm.get('passengerNames')?.value) {
                <div class="flex gap-2 flex-wrap">
                  <span class="font-medium text-gray-800 min-w-28">Names:</span>
                  <span class="whitespace-pre-line">{{ detailsForm.get('passengerNames')?.value }}</span>
                </div>
              }
              @if (detailsForm.get('requestedVehicleType')?.value) {
                <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-28">Vehicle Type:</span> {{ detailsForm.get('requestedVehicleType')?.value }}</div>
              }
              @if (detailsForm.get('additionalRemarks')?.value) {
                <div class="flex gap-2 flex-wrap">
                  <span class="font-medium text-gray-800 min-w-28">Remarks:</span>
                  <span class="italic text-gray-500">{{ detailsForm.get('additionalRemarks')?.value }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Terms & Conditions agreement -->
          <label
            class="flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors select-none"
            [class.border-primary]="termsAccepted()"
            [class.bg-primary/5]="termsAccepted()"
            [class.border-gray-200]="!termsAccepted()"
          >
            <input
              type="checkbox"
              [checked]="termsAccepted()"
              (change)="termsAccepted.set(!termsAccepted())"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary cursor-pointer"
            />
            <span class="text-sm text-gray-700 leading-snug">
              I have read and agree to the
              <a
                routerLink="/customer/van/terms"
                target="_blank"
                class="font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
              >University Van Terms and Conditions</a>.
            </span>
          </label>

          @if (submitError()) {
            <div class="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              <ui-icon name="error_outline" class="text-base shrink-0" />
              {{ submitError() }}
            </div>
          }
        </div>
      }

      @if (submitted()) {
        <app-reservation-submitted-modal
          message="Your University Van reservation request has been sent. You will be notified once it's confirmed."
          [returnPath]="returnPath"
          [returnLabel]="returnLabel"
        />
      }

      @if (otpOpen()) {
        <app-reservation-otp-modal
          [email]="otpEmail()"
          [contactPerson]="otpContactPerson()"
          (verified)="onOtpVerified($event)"
          (cancelled)="onOtpCancelled()"
        />
      }
    </div>

    <!-- Navigation buttons -->
    @if (!submitted()) {
      <div class="shrink-0 p-6 flex gap-3 sticky bottom-0 z-20 bg-white/40 backdrop-blur-md border-t border-gray-100">
        @if (currentStep() === 1) {
          <button type="button" uiButton variant="secondary" class="flex-1 bg-white/50" (click)="addMoreDates.emit()">
            ← Modify Date
          </button>
        } @else {
          <button uiButton variant="secondary" type="button" class="flex-1 bg-white/50" (click)="prevStep()">BACK</button>
        }

        @if (currentStep() < 3) {
          <button
            uiButton
            variant="primary"
            type="button"
            class="flex-1 !bg-primary hover:!bg-primary/90"
            [disabled]="!canProceed()"
            (click)="nextStep()"
          >
            NEXT
          </button>
        } @else {
          <button
            uiButton
            variant="primary"
            type="button"
            class="flex-1 !bg-primary hover:!bg-primary/90"
            [disabled]="!canSubmit() || submitting()"
            (click)="submit()"
          >
            @if (submitting()) {
              <ui-icon name="autorenew" class="animate-spin mr-1" />
              SUBMITTING...
            } @else {
              SUBMIT RESERVATION
            }
          </button>
        }
      </div>
    }
  `,
})
export class VanStepper implements OnChanges {
  @Input() adminMode = false;
  @Input() selectedDates: ReservedDateSlot[] = [];
  @Input() returnPath = '/customer';
  @Input() returnLabel = 'Back to Home';
  @Output() addMoreDates = new EventEmitter<void>();

  @HostBinding('class.h-full') get hostHFull(): boolean {
    return !this.adminMode;
  }

  @HostBinding('class.min-h-0') get hostMinH0(): boolean {
    return !this.adminMode;
  }

  private readonly reservationService = inject(VanReservationService);
  private readonly allowedEmailsService = inject(AllowedEmailsService);

  readonly lpuEmailDomain = LPU_LAGUNA_EMAIL_DOMAIN;

  readonly steps = [
    { id: 1, label: 'DATES & TIMES' },
    { id: 2, label: 'TRIP DETAILS' },
    { id: 3, label: 'CONTACT INFO' },
  ];

  readonly departmentOptions = VAN_DEPARTMENT_SELECT_OPTIONS;
  readonly schoolOptions = [...VAN_SCHOOL_OPTIONS];

  readonly currentStep = signal(1);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly otpOpen = signal(false);
  readonly otpEmail = signal('');
  readonly otpContactPerson = signal('');
  readonly termsAccepted = signal(false);

  readonly dateSlots = signal<ReservedDateSlot[]>([]);

  readonly detailsForm = new FormGroup({
    school: new FormControl('LPU-L', Validators.required),
    department: new FormControl('', Validators.required),
    organization: new FormControl('', Validators.required),
    travelDestination: new FormControl('', Validators.required),
    passengerNames: new FormControl('', Validators.required),
    numberOfPassengers: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    requestedVehicleType: new FormControl(''),
    returnTime: new FormControl({ value: '', disabled: true }),
    additionalRemarks: new FormControl(''),
  });

  readonly contactForm = new FormGroup({
    contactPerson: new FormControl('', Validators.required),
    contactEmail: new FormControl('', [
      Validators.required,
      Validators.email,
      (control) => (isLpuLagunaEmail(control.value ?? '') ? null : { lpuDomain: true }),
    ]),
    contactNumber: new FormControl('', [Validators.required, philippinePhoneValidator]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDates']) {
      const incoming = changes['selectedDates'].currentValue as ReservedDateSlot[];
      this.dateSlots.set(incoming.map(s => ({ ...s })));
      this.syncReturnTime();
    }
  }

  private syncReturnTime(): void {
    const slots = this.dateSlots();
    const endTime = slots.length > 0 ? slots[0].endTime : '';
    this.detailsForm.get('returnTime')?.setValue(endTime ? this.formatTimeDisplay(endTime) : '');
  }

  removeDateSlot(date: string): void {
    this.dateSlots.update(slots => slots.filter(s => s.date !== date));
    this.syncReturnTime();
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatTimeDisplay(timeStr: string): string {
    return formatTime12(timeStr);
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) {
      return this.dateSlots().length > 0;
    }
    if (this.currentStep() === 2) {
      return this.detailsForm.valid;
    }
    return false;
  }

  canSubmit(): boolean {
    return this.contactForm.valid && this.dateSlots().length > 0 && this.termsAccepted();
  }

  nextStep(): void {
    if (this.currentStep() === 2) {
      this.detailsForm.markAllAsTouched();
      if (!this.detailsForm.valid) return;
    }
    if (this.currentStep() < 3) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.submitError.set('');
      this.currentStep.update(s => s - 1);
    }
  }

  submit(): void {
    this.contactForm.markAllAsTouched();
    if (!this.canSubmit()) return;

    const email = this.contactForm.value.contactEmail!.trim().toLowerCase();
    const contactPerson = this.contactForm.value.contactPerson!;
    this.submitError.set('');

    if (this.adminMode) {
      this.submitReservation(email);
      return;
    }

    this.submitting.set(true);
    this.allowedEmailsService.checkEmail(email).subscribe({
      next: (check) => {
        this.submitting.set(false);
        if (!check.allowed) {
          this.submitError.set(check.message || 'This email is not authorized to make reservations.');
          return;
        }
        this.otpEmail.set(email);
        this.otpContactPerson.set(contactPerson);
        this.otpOpen.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.submitError.set('Unable to verify email. Please try again.');
      },
    });
  }

  onOtpVerified(otpToken: string): void {
    this.otpOpen.set(false);
    this.submitReservation(this.otpEmail(), otpToken);
  }

  onOtpCancelled(): void {
    this.otpOpen.set(false);
    this.submitting.set(false);
  }

  private submitReservation(email: string, otpToken?: string): void {
    this.submitting.set(true);
    this.submitError.set('');

    const slots = this.dateSlots();
    const returnTimeRaw = slots.length > 0 ? slots[0].endTime : '';

    const payload: VanReservationPayload = {
      school: this.detailsForm.get('school')!.value!,
      department: this.detailsForm.get('department')!.value!,
      organization: this.detailsForm.get('organization')!.value!,
      travelDestination: this.detailsForm.get('travelDestination')!.value!,
      passengerNames: this.detailsForm.get('passengerNames')!.value!,
      numberOfPassengers: Number(this.detailsForm.get('numberOfPassengers')!.value),
      returnTime: returnTimeRaw,
      contactPerson: this.contactForm.value.contactPerson!,
      contactEmail: email,
      contactNumber: this.contactForm.value.contactNumber!,
      reservedDates: this.dateSlots(),
      additionalRemarks: this.detailsForm.value.additionalRemarks || undefined,
      requestedVehicleType: this.detailsForm.value.requestedVehicleType || undefined,
      otpToken,
    };

    this.reservationService.submitReservation(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.success) {
          this.submitted.set(true);
        } else {
          this.submitError.set(res.message || 'Failed to submit reservation. Please try again.');
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set(err?.error?.message || 'A server error occurred. Please try again later.');
      },
    });
  }
}
