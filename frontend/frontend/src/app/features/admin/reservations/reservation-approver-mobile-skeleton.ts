import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Skeleton cards for admin reservation approver lists on mobile while data is loading. */
@Component({
  selector: 'app-reservation-approver-mobile-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 p-3 md:hidden">
      @for (row of skeletonRows; track row) {
        <div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
              <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
            </div>
            <div class="h-6 w-16 animate-pulse rounded-full bg-gray-200"></div>
          </div>
          <div class="mt-3 h-3 w-full animate-pulse rounded bg-gray-200"></div>
          <div class="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200"></div>
          <div class="mt-4 flex gap-2">
            <div class="h-9 flex-1 animate-pulse rounded-lg bg-gray-200"></div>
            <div class="h-9 flex-1 animate-pulse rounded-lg bg-gray-200"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReservationApproverMobileSkeleton {
  protected readonly skeletonRows = [1, 2, 3, 4, 5];
}
