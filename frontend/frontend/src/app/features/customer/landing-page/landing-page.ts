import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon, UiButton } from '../../../shared/ui';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, UiIcon, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-h-screen relative overflow-hidden',
  },
  template: `
    <!-- Background overlay -->
    <div class="absolute inset-0 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat z-0 opacity-60"></div>
    <div class="absolute inset-0 bg-white/60 backdrop-blur-sm z-0"></div>

    <div class="relative z-10 flex flex-col items-center justify-between min-h-screen p-4 gap-4 md:gap-8">
      <!-- Header / Logo Area -->
      <div class="text-center shrink-0 flex flex-col items-center gap-4 relative w-full max-w-7xl mx-auto">
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
          class="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-xl aspect-square"
        />
        <div class="flex flex-col gap-2">
          <h1 class="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-900 drop-shadow-sm">LYCEUM OF THE PHILIPPINES UNIVERSITY - LAGUNA</h1>
          <h2 class="text-sm sm:text-xl md:text-2xl font-light tracking-widest text-gray-700">ONLINE RESERVATION SYSTEM</h2>
          <h2 class="text-xs sm:text-lg md:text-xl font-light tracking-widest text-gray-700">Common Learning Spaces</h2>
        </div>
      </div>

      <!-- Facilities Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 max-w-7xl w-full mx-auto flex-1 content-start md:content-stretch">

        <a routerLink="/customer/van" class="facility-card group">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="airport_shuttle" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          </span>
          <span class="facility-card-label">University Van</span>
        </a>

        <a routerLink="/customer/flt" class="facility-card group">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="stadium" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          </span>
          <span class="facility-card-label">FLT Theater</span>
        </a>

        <a routerLink="/customer/gymnasium" class="facility-card group">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="sports_basketball" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          </span>
          <span class="facility-card-label">Gymnasium</span>
        </a>

        <div class="facility-card--disabled">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="groups" class="text-3xl md:text-[80px] opacity-80" />
          </span>
          <span class="facility-card-label">Boardroom</span>
          <span class="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Coming soon</span>
        </div>

        <div class="facility-card--disabled">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="co_present" class="text-3xl md:text-[80px] opacity-80" />
          </span>
          <span class="facility-card-label">Nexus Room</span>
          <span class="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Coming soon</span>
        </div>

        <div class="facility-card--disabled">
          <span class="facility-card-icon" aria-hidden="true">
            <ui-icon name="meeting_room" class="text-3xl md:text-[80px] opacity-80" />
          </span>
          <span class="facility-card-label">Conference Room</span>
          <span class="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Coming soon</span>
        </div>

      </div>

      <!-- Footer -->
      <div class="shrink-0 pb-4 text-center text-xs text-gray-500 font-medium">
        &copy; 2026 LPU - Laguna. Developed by the Management Information Systems (MIS) Department. All rights reserved.
      </div>
    </div>
  `,
})
export class LandingPage {}
