import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiIcon } from '../../../shared/ui';

@Component({
  selector: 'app-facilities-gym',
  imports: [ UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="animate-rise flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl bg-white/45 backdrop-blur-xl ring-1 ring-inset ring-white/60 p-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] min-h-96">

    <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100">
      <ui-icon name="sports_gymnastics" class="text-5xl text-emerald-600" />
    </div>

    <div>
      <h1 class="text-2xl font-extrabold text-gray-900">Gymnasium Scheduling</h1>
      <p class="mt-2 max-w-md text-sm text-gray-500">
        Gymnasium reservation management is being set up. Once the reservation system
        is connected, you will be able to view, approve, and manage gymnasium bookings here.
      </p>
    </div>

    <span class="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700">
      <ui-icon name="construction" class="text-sm" />
      Coming Soon
    </span>

  </div>
`,
})
export class FacilitiesGym {}
