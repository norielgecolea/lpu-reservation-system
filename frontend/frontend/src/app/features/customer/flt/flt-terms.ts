import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

@Component({
  selector: 'app-flt-terms',
  imports: [RouterLink, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg">
        <div class="max-w-screen-md mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <a routerLink="/customer/flt"
            class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm cursor-pointer">
            <ui-icon name="arrow_back" class="text-xl" />
            Back to Reservation
          </a>
          <div class="flex-1 text-center">
            <h1 class="text-xl font-black tracking-tight">FLT Theater Terms and Conditions</h1>
          </div>
          <div class="w-32"></div>
        </div>
      </div>

      <div class="max-w-screen-md mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <!-- Overview -->
        <div class="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <ui-icon name="stadium" class="text-primary text-lg" />
            LPU Laguna FLT Theater Reservation Policy
          </h2>
          <p class="text-sm text-gray-500">
            By submitting a reservation request for the LPU Laguna FLT Theater, you agree to the following terms and conditions.
            Please read them carefully before proceeding.
          </p>
        </div>

        <!-- Terms sections -->
        @for (section of sections; track section.title) {
          <div class="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-6 flex flex-col gap-3">
            <h3 class="font-bold text-gray-900 flex items-center gap-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-black">{{ $index + 1 }}</span>
              {{ section.title }}
            </h3>
            <ul class="flex flex-col gap-2">
              @for (item of section.items; track item) {
                <li class="flex items-start gap-2 text-sm text-gray-600">
                  <ui-icon name="chevron_right" class="text-primary text-base shrink-0 mt-0.5" />
                  {{ item }}
                </li>
              }
            </ul>
          </div>
        }

        <!-- Agreement -->
        <div class="rounded-2xl bg-primary/5 ring-1 ring-primary/20 p-6 text-center">
          <p class="text-sm font-semibold text-primary mb-3">
            By checking "I agree" in the reservation form, you acknowledge that you have read, understood, and agree to all of these terms and conditions.
          </p>
          <a routerLink="/customer/flt"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer">
            <ui-icon name="arrow_back" class="text-base" />
            Back to Reservation
          </a>
        </div>
      </div>
    </div>
  `,
})
export class FltTerms {
  readonly sections = [
    {
      title: 'Eligibility and Authorization',
      items: [
        'The FLT Theater is available exclusively for official LPU events, academic activities, departmental programs, and recognized student organization activities.',
        'All reservation requests must be filed by a faculty member, department head, or authorized student organization officer.',
        'Personal or commercial use of the facility is strictly prohibited.',
      ],
    },
    {
      title: 'Reservation and Lead Time',
      items: [
        'All reservation requests must be submitted at least fourteen (14) calendar days before the intended date of use.',
        'Requests submitted within the 14-day lead time will not be processed.',
        'Reservations are subject to the approval of the FLT Theater Administrator. Submission of a request does not guarantee approval.',
        'Only one reservation per event per day is allowed.',
      ],
    },
    {
      title: 'Room Capacity',
      items: [
        'The number of attendees must not exceed the declared capacity of the selected room at any time during the event.',
        'FLT Theater — Maximum 300 pax.',
        'Amphitheater — Maximum 150 pax.',
        'Banquet Hall — Maximum 100 pax.',
        'Overcrowding beyond the approved capacity is grounds for immediate termination of the event without refund or recourse.',
      ],
    },
    {
      title: 'Equipment and Facilities',
      items: [
        'Only equipment listed and approved through the reservation system may be used.',
        'Users are responsible for the proper handling of all FLT equipment. Any damage to equipment caused by negligence or misuse will be charged to the requesting party.',
        'Equipment must be returned in its original state and location after the event.',
        'Unauthorized removal of equipment from the facility is strictly prohibited.',
      ],
    },
    {
      title: 'Conduct and House Rules',
      items: [
        'The venue must be kept clean and orderly at all times. The requesting party is responsible for cleaning up after the event.',
        'Food and beverages are not allowed inside the main theater area unless explicitly permitted by the administration.',
        'Smoking, drinking of alcoholic beverages, and any form of gambling are strictly prohibited within the facility.',
        'Noise levels must be kept within acceptable limits to avoid disturbance to neighboring areas.',
      ],
    },
    {
      title: 'Cancellation and No-show Policy',
      items: [
        'Cancellations must be formally communicated to the FLT Administration at least three (3) business days before the scheduled event.',
        "Failure to cancel within this period or a no-show may result in the suspension of the requesting party's reservation privileges for up to one (1) semester.",
        'The administration reserves the right to cancel any approved reservation due to unforeseen circumstances such as emergencies or university-mandated events.',
      ],
    },
    {
      title: 'Data Privacy',
      items: [
        "Personal information collected during the reservation process is used solely for the purpose of managing reservations in accordance with LPU's Data Privacy Policy and Republic Act No. 10173.",
        'Information will not be shared with third parties without your consent.',
      ],
    },
    {
      title: 'Amendments',
      items: [
        'LPU reserves the right to amend these Terms and Conditions at any time without prior notice. It is the responsibility of the reserving party to review the current terms before each reservation.',
      ],
    },
  ];
}
