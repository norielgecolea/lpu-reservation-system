import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Skeleton rows for admin reservation approver tables while data is loading. */
@Component({
  selector: 'app-reservation-approver-table-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (row of skeletonRows; track row) {
      <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50/70">
        <td class="px-4 py-3">
          <div class="h-4 w-8 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="px-4 py-3">
          <div class="h-4 w-36 animate-pulse rounded bg-gray-200"></div>
          <div class="mt-2 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="hidden px-4 py-3 md:table-cell">
          <div class="h-4 w-28 animate-pulse rounded bg-gray-200"></div>
          <div class="mt-2 h-3 w-24 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="hidden px-4 py-3 lg:table-cell">
          <div class="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
          <div class="mt-2 h-3 w-40 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="hidden px-4 py-3 xl:table-cell">
          <div class="h-3 w-36 animate-pulse rounded bg-gray-200"></div>
          <div class="mt-2 h-3 w-32 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="hidden px-4 py-3 lg:table-cell">
          <div class="h-4 w-20 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="hidden px-4 py-3 xl:table-cell">
          <div class="h-4 w-24 animate-pulse rounded bg-gray-200"></div>
        </td>
        <td class="px-4 py-3">
          <div class="h-6 w-20 animate-pulse rounded-full bg-gray-200"></div>
        </td>
        <td class="px-4 py-3">
          <div class="ml-auto flex justify-end gap-2">
            <div class="h-8 w-20 animate-pulse rounded-lg bg-gray-200"></div>
            <div class="h-8 w-16 animate-pulse rounded-lg bg-gray-200"></div>
          </div>
        </td>
      </tr>
    }
  `,
})
export class ReservationApproverTableSkeleton {
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];
}
