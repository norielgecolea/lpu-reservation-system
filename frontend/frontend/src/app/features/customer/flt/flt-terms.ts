import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

@Component({
  selector: 'app-flt-terms',
  imports: [RouterLink, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col min-h-screen bg-gray-50',
  },
  template: `
    <!-- Header -->
    <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg shrink-0">
      <div class="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <img src="/logo.svg" alt="LPU Logo" class="w-10 h-10 shrink-0 object-contain drop-shadow" />
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-black tracking-tight leading-tight">FLT Theater</h1>
          <p class="text-white/60 text-xs">Terms and Conditions of Use</p>
        </div>
        <a routerLink="/customer/flt"
          class="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer">
          <ui-icon name="arrow_back" class="text-base" />
          Back
        </a>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-8">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 flex flex-col gap-8">

        <!-- Intro -->
        <div class="flex flex-col gap-2">
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">Lyceum of the Philippines University</p>
          <h2 class="text-2xl font-black text-gray-900">FLT Theater — Terms and Conditions</h2>
          <p class="text-sm text-gray-500 leading-relaxed">
            These Terms and Conditions govern the reservation and use of the Feliciano L. Torres (FLT) Theater facility at Lyceum of the Philippines University. By submitting a reservation request, you agree to comply fully with the policies stated herein.
          </p>
        </div>

        <!-- Section 1 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">1</span>
            Eligibility and Authorization
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The FLT Theater is available exclusively for official LPU events, academic activities, departmental programs, and recognized student organization activities.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> All reservation requests must be filed by a faculty member, department head, or authorized student organization officer.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Personal or commercial use of the facility is strictly prohibited.</li>
          </ul>
        </section>

        <!-- Section 2 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">2</span>
            Reservation and Lead Time
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> All reservation requests must be submitted at least <strong class="text-gray-800">fourteen (14) calendar days</strong> before the intended date of use.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Requests submitted within the 14-day lead time will not be processed.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Reservations are subject to the approval of the FLT Theater Administrator. Submission of a request does not guarantee approval.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Only one reservation per event per day is allowed.</li>
          </ul>
        </section>

        <!-- Section 3 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">3</span>
            Room Capacity
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The number of attendees must not exceed the declared capacity of the selected room at any time during the event.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> <strong class="text-gray-800">FLT Theater</strong> — Maximum 300 pax.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> <strong class="text-gray-800">Amphitheater</strong> — Maximum 150 pax.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> <strong class="text-gray-800">Banquet Hall</strong> — Maximum 100 pax.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Overcrowding beyond the approved capacity is grounds for immediate termination of the event without refund or recourse.</li>
          </ul>
        </section>

        <!-- Section 4 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">4</span>
            Equipment and Facilities
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Only equipment listed and approved through the reservation system may be used.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Users are responsible for the proper handling of all FLT equipment. Any damage to equipment caused by negligence or misuse will be charged to the requesting party.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Equipment must be returned in its original state and location after the event.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Unauthorized removal of equipment from the facility is strictly prohibited.</li>
          </ul>
        </section>

        <!-- Section 5 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">5</span>
            Conduct and House Rules
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The venue must be kept clean and orderly at all times. The requesting party is responsible for cleaning up after the event.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Food and beverages are not allowed inside the main theater area unless explicitly permitted by the administration.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Smoking, drinking of alcoholic beverages, and any form of gambling are strictly prohibited within the facility.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Noise levels must be kept within acceptable limits to avoid disturbance to neighboring areas.</li>
          </ul>
        </section>

        <!-- Section 6 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">6</span>
            Cancellation and No-show Policy
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Cancellations must be formally communicated to the FLT Administration at least <strong class="text-gray-800">three (3) business days</strong> before the scheduled event.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Failure to cancel within this period or a no-show may result in the suspension of the requesting party's reservation privileges for up to one (1) semester.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The administration reserves the right to cancel any approved reservation due to unforeseen circumstances such as emergencies or university-mandated events.</li>
          </ul>
        </section>

        <!-- Section 7 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">7</span>
            Data Privacy
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Personal information collected during the reservation process is used solely for the purpose of managing reservations in accordance with LPU's Data Privacy Policy and Republic Act No. 10173.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Information will not be shared with third parties without your consent.</li>
          </ul>
        </section>

        <!-- Section 8 -->
        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">8</span>
            Amendments
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> LPU reserves the right to amend these Terms and Conditions at any time without prior notice. It is the responsibility of the reserving party to review the current terms before each reservation.</li>
          </ul>
        </section>

        <!-- Footer -->
        <div class="rounded-xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-2">
          <p class="text-xs text-gray-400 leading-relaxed">
            By proceeding with your reservation request, you acknowledge that you have read, understood, and agreed to all the terms and conditions stated above. Non-compliance with any of these rules may result in cancellation of the reservation and/or disciplinary action.
          </p>
          <p class="text-xs text-gray-400">
            For inquiries, please contact the FLT Theater Administration Office.
          </p>
        </div>

        <!-- Back button -->
        <div class="flex justify-end">
          <a routerLink="/customer/flt"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow hover:opacity-90 transition-opacity cursor-pointer">
            <ui-icon name="arrow_back" class="text-base" />
            Back to Reservation
          </a>
        </div>

      </div>
    </div>
  `,
})
export class FltTerms {}
