import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

const VAN_HEADER = 'bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)]';

@Component({
  selector: 'app-van-terms',
  imports: [RouterLink, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col min-h-screen bg-gray-50',
  },
  template: `
    <div class="${VAN_HEADER} text-white shadow-lg shrink-0">
      <div class="max-w-screen-lg mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        <img src="/logo.svg" alt="LPU Logo" class="w-10 h-10 shrink-0 object-contain drop-shadow" />
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-black tracking-tight leading-tight">University Van</h1>
          <p class="text-white/60 text-xs">Terms and Conditions of Use</p>
        </div>
        <a routerLink="/customer/van"
          class="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer">
          <ui-icon name="arrow_back" class="text-base" />
          Back
        </a>
      </div>
    </div>

    <div class="flex-1 max-w-screen-lg mx-auto w-full px-4 sm:px-6 py-8">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 flex flex-col gap-8">

        <div class="flex flex-col gap-2">
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">Lyceum of the Philippines University</p>
          <h2 class="text-2xl font-black text-gray-900">University Van — Terms and Conditions</h2>
          <p class="text-sm text-gray-500 leading-relaxed">
            These Terms and Conditions govern the reservation and use of University Van services at Lyceum of the Philippines University - Laguna. By submitting a reservation request, you agree to comply fully with the policies stated herein.
          </p>
        </div>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">1</span>
            Eligibility and Authorization
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> University Van services are available exclusively for official LPU events, academic activities, departmental programs, and recognized student organization activities.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> All reservation requests must be filed by a faculty member, department head, or authorized student organization officer.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Personal or commercial use of university vans is strictly prohibited.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">2</span>
            Reservation and Lead Time
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> All reservation requests must be submitted at least <strong class="text-gray-800">five (5) calendar days</strong> before the intended date of travel.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Requests submitted within the 14-day lead time will not be processed.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Reservations are subject to the approval of the Transport Services Office. Submission of a request does not guarantee approval.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Vehicle and driver assignment will be made upon approval based on availability.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">3</span>
            Passenger Information
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> All passengers must be listed in the reservation form. Only listed passengers may ride the assigned vehicle.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The number of passengers must not exceed the capacity of the assigned vehicle.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The requesting party is responsible for the conduct of all passengers during the trip.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">4</span>
            Conduct and Safety
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Passengers must follow all safety instructions from the assigned driver at all times.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Smoking, drinking of alcoholic beverages, and any form of disruptive behavior inside the vehicle are strictly prohibited.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The vehicle must be kept clean. The requesting party is responsible for any damage caused by negligence or misuse.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">5</span>
            Cancellation and No-show Policy
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Cancellations must be formally communicated to the Transport Services Office at least <strong class="text-gray-800">three (3) business days</strong> before the scheduled trip.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Failure to cancel within this period or a no-show may result in suspension of reservation privileges.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> The administration reserves the right to cancel any approved reservation due to emergencies or operational requirements.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-800">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-black">6</span>
            Data Privacy
          </h3>
          <ul class="flex flex-col gap-1.5 text-sm text-gray-600 list-none pl-9">
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Personal information collected during the reservation process is used solely for managing reservations in accordance with LPU's Data Privacy Policy and Republic Act No. 10173.</li>
            <li class="flex gap-2"><ui-icon name="circle" class="text-[8px] text-primary mt-1.5 shrink-0" /> Information will not be shared with third parties without your consent.</li>
          </ul>
        </section>

        <div class="rounded-xl bg-gray-50 border border-gray-200 p-4 flex flex-col gap-2">
          <p class="text-xs text-gray-400 leading-relaxed">
            By proceeding with your reservation request, you acknowledge that you have read, understood, and agreed to all the terms and conditions stated above. Non-compliance with any of these rules may result in cancellation of the reservation and/or disciplinary action.
          </p>
          <p class="text-xs text-gray-400">
            For inquiries, please contact the Transport Services Office.
          </p>
        </div>

        <div class="flex justify-end">
          <a routerLink="/customer/van"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-primary/90 transition-colors cursor-pointer">
            <ui-icon name="arrow_back" class="text-base" />
            Back to Reservation
          </a>
        </div>

      </div>
    </div>
  `,
})
export class VanTerms {}
