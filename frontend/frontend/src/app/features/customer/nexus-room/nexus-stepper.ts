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
import { DEPARTMENT_SELECT_OPTIONS, EXTERNAL_DEPARTMENT } from '../../../shared/constants/department-options';
import { ExternalEventNoticeBanner } from '../../../shared/components/external-event-notice-banner';
import {
  NexusEquipmentItem,
  NexusReservationPayload,
  ReservedDateSlot,
} from './nexus-reservation.models';
import { NexusReservationService } from './nexus-reservation.service';
import { ReservationSubmittedModal } from '../reservation-submitted-modal';
import { ReservationOtpModal } from '../reservation-otp-modal';
import { formatTime12 } from '../../../shared/utils/datetime.util';
import { philippinePhoneValidator } from '../../../shared/utils/ph-phone.util';

@Component({
  selector: 'app-nexus-stepper',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiInput, UiLabel, UiIcon, UiSelect, ReservationSubmittedModal, ReservationOtpModal, ExternalEventNoticeBanner],
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
              <p class="text-sm text-gray-500 mt-0.5">Review your date and time selections.</p>
            </div>
            <button type="button" (click)="addMoreDates.emit()"
              class="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/30 rounded-lg px-3 py-1.5">
              <ui-icon name="add" class="text-sm" />
              Add More Dates
            </button>
          </div>

          @if (dateSlots().length === 0) {
            <div class="flex flex-col items-center justify-center gap-3 py-10 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <ui-icon name="calendar_month" class="text-4xl text-gray-300" />
              <p class="text-sm font-semibold text-gray-500">No dates selected</p>
              <button type="button" (click)="addMoreDates.emit()"
                class="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer">
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
                    <button type="button" (click)="removeDateSlot(slot.date)"
                      class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                      <ui-icon name="close" class="text-base" />
                    </button>
                  </div>
                  <div class="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
                    <ui-icon name="schedule" class="text-primary text-base shrink-0" />
                    <span class="font-semibold text-gray-700">{{ formatTimeDisplay(slot.startTime) }} – {{ formatTimeDisplay(slot.endTime) }}</span>
                    <span class="ml-auto text-xs text-gray-400">Time slot confirmed</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Step 2: Event Details & Equipment -->
      @if (currentStep() === 2) {
        <div class="flex flex-col gap-4 animate-fade-in">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Event Details</h2>
            <p class="text-sm text-gray-500 mt-0.5">Fill in the event information and select needed equipment.</p>
          </div>

          <div [formGroup]="detailsForm" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="eventTitle">Event Title <span class="text-red-500">*</span></label>
                <input uiInput id="eventTitle" formControlName="eventTitle" placeholder="e.g. Annual Sports Festival" />
                @if (detailsForm.get('eventTitle')?.invalid && detailsForm.get('eventTitle')?.touched) {
                  <p class="text-xs text-red-500">Event title is required.</p>
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
                <label uiLabel for="numberOfAttendees">Number of Attendees <span class="text-red-500">*</span></label>
                <input uiInput type="number" id="numberOfAttendees" formControlName="numberOfAttendees" placeholder="e.g. 100" min="1" />
                @if (detailsForm.get('numberOfAttendees')?.invalid && detailsForm.get('numberOfAttendees')?.touched) {
                  @if (detailsForm.get('numberOfAttendees')?.errors?.['required']) {
                    <p class="text-xs text-red-500">Number of attendees is required.</p>
                  } @else if (detailsForm.get('numberOfAttendees')?.errors?.['min']) {
                    <p class="text-xs text-red-500">Must be at least 1.</p>
                  }
                }
              </div>

              <div class="sm:col-span-2 flex flex-col gap-2">
                <label uiLabel for="additionalInstructions">Additional Instructions <span class="text-xs font-normal text-gray-400">(optional)</span></label>
                <textarea
                  id="additionalInstructions"
                  formControlName="additionalInstructions"
                  rows="3"
                  placeholder="Any special requests, setup requirements, or notes for the Nexus Room team..."
                  class="w-full rounded-lg border border-zinc-950/15 bg-white/70 backdrop-blur-md backdrop-saturate-150 ring-1 ring-inset ring-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(24,24,27,0.05),0_2px_8px_-3px_rgba(24,24,27,0.2)] px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/55 transition-all duration-200 resize-none"
                ></textarea>
              </div>
            </div>

            <!-- Equipment -->
            <div class="flex flex-col gap-3">
              <div>
                <label uiLabel>Request Equipment</label>
                <p class="text-xs text-gray-500 mt-0.5">Select the equipment you need for your event.</p>
              </div>
              @if (equipmentLoading) {
                <div class="flex items-center gap-2 text-sm text-gray-400 py-4">
                  <ui-icon name="autorenew" class="text-lg animate-spin" />
                  Loading available equipment...
                </div>
              } @else if (availableEquipment.length === 0) {
                <div class="py-4 text-sm text-gray-400 italic">No equipment available for Nexus Room.</div>
              } @else {
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  @for (eq of availableEquipment; track eq.id) {
                    <button type="button" (click)="toggleEquipment(eq)"
                      class="h-10 rounded-lg border text-sm font-medium transition-all duration-200 truncate px-3 cursor-pointer"
                      [class.border-primary]="isEquipmentSelected(eq.id)"
                      [class.bg-primary]="isEquipmentSelected(eq.id)"
                      [class.text-white]="isEquipmentSelected(eq.id)"
                      [class.border-gray-300]="!isEquipmentSelected(eq.id)"
                      [class.bg-white]="!isEquipmentSelected(eq.id)"
                      [class.text-gray-600]="!isEquipmentSelected(eq.id)"
                      [title]="eq.name"
                    >{{ eq.name }}</button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Step 3: Contact Info + Terms -->
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
              <input uiInput id="contactEmail" type="email" formControlName="contactEmail" placeholder="you@example.com" />
              @if (contactForm.get('contactEmail')?.invalid && contactForm.get('contactEmail')?.touched) {
                <p class="text-xs text-red-500">
                  @if (contactForm.get('contactEmail')?.errors?.['required']) { Email is required. }
                  @if (contactForm.get('contactEmail')?.errors?.['email']) { Please enter a valid email address. }
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
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-24">Event:</span> {{ detailsForm.get('eventTitle')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-24">Department:</span> {{ detailsForm.get('department')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-24">Organization:</span> {{ detailsForm.get('organization')?.value || '—' }}</div>
              <div class="flex gap-2"><span class="font-medium text-gray-800 min-w-24">Attendees:</span> {{ detailsForm.get('numberOfAttendees')?.value || '—' }}</div>
              <div class="flex gap-2 flex-wrap">
                <span class="font-medium text-gray-800 min-w-24">Dates:</span>
                <span>
                  @for (slot of dateSlots(); track slot.date; let last = $last) {
                    {{ formatDateDisplay(slot.date) }} ({{ formatTimeDisplay(slot.startTime) }} – {{ formatTimeDisplay(slot.endTime) }}){{ !last ? ', ' : '' }}
                  }
                </span>
              </div>
              @if (selectedEquipment().length > 0) {
                <div class="flex gap-2 flex-wrap">
                  <span class="font-medium text-gray-800 min-w-24">Equipment:</span>
                  <span>{{ selectedEquipment().map(e => e.name).join(', ') }}</span>
                </div>
              }
              @if (detailsForm.get('additionalInstructions')?.value) {
                <div class="flex gap-2 flex-wrap">
                  <span class="font-medium text-gray-800 min-w-24">Notes:</span>
                  <span class="italic text-gray-500">{{ detailsForm.get('additionalInstructions')?.value }}</span>
                </div>
              }
            </div>
          </div>

          @if (detailsForm.get('department')?.value === externalDepartment) {
            <app-external-event-notice-banner />
          }

          <!-- Terms & Conditions -->
          <label
            class="flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors select-none"
            [class.border-primary]="termsAccepted()"
            [class.bg-primary/5]="termsAccepted()"
            [class.border-gray-200]="!termsAccepted()"
          >
            <input type="checkbox"
              [checked]="termsAccepted()"
              (change)="termsAccepted.set(!termsAccepted())"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-primary cursor-pointer"
            />
            <span class="text-sm text-gray-700 leading-snug">
              I have read and agree to the
              <a routerLink="/customer/nexus-room/terms" target="_blank"
                class="font-semibold text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
                Nexus Room Terms and Conditions
              </a>.
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
          message="Your Nexus Room reservation request has been sent. You will be notified once it's confirmed."
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
            ← ADD DATES
          </button>
        } @else {
          <button uiButton variant="secondary" type="button" class="flex-1 bg-white/50" (click)="prevStep()">BACK</button>
        }

        @if (currentStep() < 3) {
          <button uiButton variant="primary" type="button" class="flex-1" [disabled]="!canProceed()" (click)="nextStep()">
            NEXT
          </button>
        } @else {
          <button uiButton variant="primary" type="button" class="flex-1" [disabled]="!canSubmit() || submitting()" (click)="submit()">
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
export class NexusStepper implements OnChanges {
  @Input() adminMode = false;
  @Input() selectedDates: ReservedDateSlot[] = [];
  @Input() availableEquipment: NexusEquipmentItem[] = [];
  @Input() equipmentLoading = false;
  @Input() returnPath = '/customer';
  @Input() returnLabel = 'Back to Home';
  @Output() addMoreDates = new EventEmitter<void>();

  @HostBinding('class.h-full') get hostHFull(): boolean {
    return !this.adminMode;
  }

  @HostBinding('class.min-h-0') get hostMinH0(): boolean {
    return !this.adminMode;
  }

  private readonly reservationService = inject(NexusReservationService);

  readonly steps = [
    { id: 1, label: 'DATES & TIMES' },
    { id: 2, label: 'EVENT DETAILS' },
    { id: 3, label: 'CONTACT INFO' },
  ];

  readonly departmentOptions = DEPARTMENT_SELECT_OPTIONS;
  readonly externalDepartment = EXTERNAL_DEPARTMENT;

  readonly currentStep = signal(1);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly otpOpen = signal(false);
  readonly otpEmail = signal('');
  readonly otpContactPerson = signal('');
  readonly termsAccepted = signal(false);

  readonly dateSlots = signal<ReservedDateSlot[]>([]);
  readonly selectedEquipment = signal<NexusEquipmentItem[]>([]);

  readonly detailsForm = new FormGroup({
    eventTitle: new FormControl('', Validators.required),
    department: new FormControl('', Validators.required),
    organization: new FormControl('', Validators.required),
    numberOfAttendees: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    additionalInstructions: new FormControl(''),
  });

  readonly contactForm = new FormGroup({
    contactPerson: new FormControl('', Validators.required),
    contactEmail: new FormControl('', [Validators.required, Validators.email]),
    contactNumber: new FormControl('', [Validators.required, philippinePhoneValidator]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDates']) {
      const incoming = changes['selectedDates'].currentValue as ReservedDateSlot[];
      this.dateSlots.set(incoming.map(s => ({ ...s })));
    }
  }

  removeDateSlot(date: string): void {
    this.dateSlots.update(slots => slots.filter(s => s.date !== date));
  }

  toggleEquipment(eq: NexusEquipmentItem): void {
    this.selectedEquipment.update(curr =>
      curr.some(e => e.id === eq.id)
        ? curr.filter(e => e.id !== eq.id)
        : [...curr, eq]
    );
  }

  isEquipmentSelected(id: number): boolean {
    return this.selectedEquipment().some(e => e.id === id);
  }

  formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }

  formatTimeDisplay(timeStr: string): string {
    return formatTime12(timeStr);
  }

  canProceed(): boolean {
    if (this.currentStep() === 1) return this.dateSlots().length > 0;
    if (this.currentStep() === 2) return this.detailsForm.valid;
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
    if (this.currentStep() < 3) this.currentStep.update(s => s + 1);
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

    this.submitError.set('');
    const email = this.contactForm.value.contactEmail!.trim().toLowerCase();
    const contactPerson = this.contactForm.value.contactPerson!;

    if (this.adminMode) {
      this.submitReservation(undefined);
      return;
    }

    this.otpEmail.set(email);
    this.otpContactPerson.set(contactPerson);
    this.otpOpen.set(true);
  }

  onOtpVerified(otpToken: string): void {
    this.otpOpen.set(false);
    this.submitReservation(otpToken);
  }

  onOtpCancelled(): void {
    this.otpOpen.set(false);
    this.submitting.set(false);
  }

  private submitReservation(otpToken?: string): void {
    this.submitting.set(true);
    this.submitError.set('');

    const payload: NexusReservationPayload = {
      eventTitle: this.detailsForm.value.eventTitle!,
      department: this.detailsForm.value.department!,
      organization: this.detailsForm.value.organization!,
      numberOfAttendees: Number(this.detailsForm.value.numberOfAttendees),
      additionalInstructions: this.detailsForm.value.additionalInstructions || undefined,
      contactPerson: this.contactForm.value.contactPerson!,
      contactEmail: this.contactForm.value.contactEmail!.trim().toLowerCase(),
      contactNumber: this.contactForm.value.contactNumber!,
      reservedDates: this.dateSlots(),
      requestedEquipment: this.selectedEquipment().map(e => ({ id: e.id, name: e.name })),
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
      error: () => {
        this.submitting.set(false);
        this.submitError.set('A server error occurred. Please try again later.');
      },
    });
  }
}
