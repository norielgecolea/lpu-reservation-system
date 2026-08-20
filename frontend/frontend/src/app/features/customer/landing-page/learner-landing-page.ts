import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_NAME, APP_VERSION } from '../../../core/app-info';
import { UiIcon, UiButton } from '../../../shared/ui';

@Component({
  selector: 'app-learner-landing-page',
  imports: [RouterLink, UiIcon, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-screen relative overflow-hidden',
  },
  template: `
    <div class="absolute inset-0 z-0 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat opacity-60"></div>
    <div class="absolute inset-0 z-0 bg-white/60 backdrop-blur-sm"></div>

    <div class="relative z-10 flex min-h-screen flex-col items-center justify-between gap-4 p-4 md:gap-8">
      <div class="relative mx-auto flex w-full max-w-7xl shrink-0 flex-col items-center gap-4 text-center">
        <div class="absolute right-4 top-0 sm:right-8">
          <a routerLink="/login" uiButton variant="link">Admin Login</a>
        </div>
        <img
          src="/logo.svg"
          alt="LPU Logo"
          width="128"
          height="128"
          fetchpriority="high"
          decoding="async"
          class="aspect-square h-20 w-20 object-contain drop-shadow-xl md:h-32 md:w-32"
        />
        <div class="flex flex-col gap-2">
          <h1 class="text-xl font-black tracking-tight text-gray-900 drop-shadow-sm sm:text-3xl md:text-4xl">
            LYCEUM OF THE PHILIPPINES UNIVERSITY - LAGUNA
          </h1>
          <h2 class="text-sm font-light tracking-widest text-gray-700 sm:text-xl md:text-2xl">
            ONLINE RESERVATION SYSTEM
          </h2>
          <h2 class="text-xs font-light tracking-widest text-gray-700 sm:text-lg md:text-xl">
            Learner Reservation
          </h2>
        </div>
      </div>

      <div
        class="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 content-start gap-3 sm:grid-cols-2 md:grid-cols-3 md:content-stretch md:gap-8"
      >
        <div class="facility-card--disabled">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="co_present" class="text-3xl opacity-80 md:text-[80px]" />
          </span>
          <span class="facility-card-label">Nexus Room</span>
        </div>

        <a routerLink="/customer/flt" class="facility-card group">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon
              name="stadium"
              class="text-3xl opacity-80 transition-opacity group-hover:opacity-100 md:text-[80px]"
            />
          </span>
          <span class="facility-card-label">FLT Theater</span>
        </a>

        <a routerLink="/customer/gymnasium" class="facility-card group">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon
              name="sports_basketball"
              class="text-3xl opacity-80 transition-opacity group-hover:opacity-100 md:text-[80px]"
            />
          </span>
          <span class="facility-card-label">Gymnasium</span>
        </a>
      </div>

      <div class="shrink-0 pb-4 text-center text-xs font-medium leading-relaxed text-gray-500">
        &copy; 2026 LPU - Laguna. Developed by the Management Information Systems (MIS) Department. All rights reserved.
        <span class="mt-0.5 block">
          {{ appName }} {{ appVersion }}.
          <a routerLink="/about" class="font-semibold text-primary underline-offset-2 hover:underline">
            About this system
          </a>
        </span>
      </div>
    </div>
  `,
})
export class LearnerLandingPage {
  protected readonly appName = APP_NAME;
  protected readonly appVersion = APP_VERSION;
}
