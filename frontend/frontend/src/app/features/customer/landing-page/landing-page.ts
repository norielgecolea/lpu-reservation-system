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
        <img src="/logo.svg" alt="LPU Logo" class="w-20 h-20 md:w-32 md:h-32 object-contain drop-shadow-xl" />
        <div class="flex flex-col gap-2">
          <h1 class="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-gray-900 drop-shadow-sm">LYCEUM OF THE PHILIPPINES UNIVERSITY - LAGUNA</h1>
          <h2 class="text-sm sm:text-xl md:text-2xl font-light tracking-widest text-gray-700">RESERVATION SYSTEM</h2>
        </div>
      </div>

      <!-- Facilities Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 max-w-7xl w-full mx-auto flex-1 content-start md:content-stretch">
        
        <a routerLink="/customer/van" class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-primary hover:-translate-y-1 transition-all duration-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-6 text-black hover:bg-primary hover:text-white cursor-pointer group h-fit md:h-full">
          <ui-icon name="airport_shuttle" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          <span class="font-bold text-base md:text-2xl">University Van</span>
        </a>

        <a routerLink="/customer/flt" class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-primary hover:-translate-y-1 transition-all duration-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-6 text-black hover:bg-primary hover:text-white cursor-pointer group h-fit md:h-full">
          <ui-icon name="stadium" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          <span class="font-bold text-base md:text-2xl">FLT Theater</span>
        </a>

        <a routerLink="/customer/gymnasium" class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-primary hover:-translate-y-1 transition-all duration-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-6 text-black hover:bg-primary hover:text-white cursor-pointer group h-fit md:h-full">
          <ui-icon name="sports_basketball" class="text-3xl md:text-[80px] opacity-80 group-hover:opacity-100 transition-opacity" />
          <span class="font-bold text-base md:text-2xl">Gymnasium</span>
        </a>

        <div class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-gray-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-3 text-gray-500 cursor-not-allowed group h-fit md:h-full opacity-75 select-none">
          <ui-icon name="groups" class="text-3xl md:text-[80px] opacity-80" />
          <span class="font-bold text-base md:text-2xl">Boardroom</span>
          <span class="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Coming soon</span>
        </div>

        <div class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-gray-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-3 text-gray-500 cursor-not-allowed group h-fit md:h-full opacity-75 select-none">
          <ui-icon name="co_present" class="text-3xl md:text-[80px] opacity-80" />
          <span class="font-bold text-base md:text-2xl">Nexus Room</span>
          <span class="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">Coming soon</span>
        </div>

        <div class="bg-white/45 backdrop-blur-xl backdrop-saturate-150 ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-6px_rgba(15,23,42,0.16)] ring-1 ring-inset ring-black/5 border-2 border-gray-300 rounded-xl p-2 md:p-4 flex flex-row md:flex-col items-center justify-start md:justify-center gap-4 md:gap-3 text-gray-500 cursor-not-allowed group h-fit md:h-full opacity-75 select-none">
          <ui-icon name="meeting_room" class="text-3xl md:text-[80px] opacity-80" />
          <span class="font-bold text-base md:text-2xl">Conference Room</span>
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
