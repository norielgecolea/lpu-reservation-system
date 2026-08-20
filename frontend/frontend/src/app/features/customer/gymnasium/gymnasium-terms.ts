import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

@Component({
  selector: 'app-gymnasium-terms',
  imports: [RouterLink, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-primary bg-[linear-gradient(135deg,#7a2342,#5f1830_55%,#8d2546)] text-white shadow-lg">
        <div class="max-w-screen-md mx-auto px-4 sm:px-6 py-5 flex items-center gap-4">
          <a routerLink="/customer/gymnasium"
            class="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm cursor-pointer">
            <ui-icon name="arrow_back" class="text-xl" />
            Back to Reservation
          </a>
          <div class="flex-1 text-center">
            <h1 class="text-xl font-black tracking-tight">Gymnasium Terms and Conditions</h1>
          </div>
          <div class="w-32"></div>
        </div>
      </div>

      <div class="max-w-screen-md mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <!-- Overview -->
        <div class="rounded-2xl bg-white ring-1 ring-black/5 shadow-sm p-6">
          <h2 class="text-base font-black text-gray-900 mb-1 flex items-center gap-2">
            <ui-icon name="sports_basketball" class="text-primary text-lg" />
            LPU Laguna Gymnasium Reservation Policy
          </h2>
          <p class="text-sm text-gray-500">
            By submitting a reservation request for the LPU Laguna Gymnasium, you agree to the following terms and conditions.
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
          <a routerLink="/customer/gymnasium"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer">
            <ui-icon name="arrow_back" class="text-base" />
            Back to Reservation
          </a>
        </div>
      </div>
    </div>
  `,
})
export class GymnasiumTerms {
  readonly sections = [
    {
      title: 'Comming Soon',
      items: [
        'Comming Soon',
        'Comming Soon',
      ],
    }
  ];
}
