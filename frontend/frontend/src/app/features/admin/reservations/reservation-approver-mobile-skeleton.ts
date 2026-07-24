import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Skeleton cards for admin reservation approver lists on mobile while data is loading. */
@Component({
  selector: 'app-reservation-approver-mobile-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 md:hidden">
      @for (row of skeletonRows; track row) {
        <div class="rounded-2xl border border-gray-100/90 bg-white p-4 shadow-sm ring-1 ring-inset ring-black/[0.02]">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-2">
              <div class="h-3 w-12 animate-pulse rounded bg-gray-200/90"></div>
              <div class="h-4 w-3/4 animate-pulse rounded-md bg-gray-200"></div>
              <div class="h-3 w-1/2 animate-pulse rounded bg-gray-200/80"></div>
            </div>
            <div class="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
          </div>
          <div class="mt-3 space-y-2 border-t border-gray-50 pt-3">
            <div class="h-3 w-full animate-pulse rounded bg-gray-200/80"></div>
            <div class="h-3 w-2/3 animate-pulse rounded bg-gray-200/70"></div>
          </div>
          <div class="mt-4 flex gap-2">
            <div class="h-9 flex-1 animate-pulse rounded-xl bg-gray-200/90"></div>
            <div class="h-9 flex-1 animate-pulse rounded-xl bg-gray-200/90"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReservationApproverMobileSkeleton {
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
}
