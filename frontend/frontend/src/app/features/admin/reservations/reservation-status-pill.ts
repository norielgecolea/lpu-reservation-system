import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Colored status pill used across admin reservation approver lists. */
@Component({
  selector: 'app-reservation-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset sm:text-xs"
      [class.bg-amber-100]="status() === 'PENDING'"
      [class.text-amber-800]="status() === 'PENDING'"
      [class.ring-amber-200/80]="status() === 'PENDING'"
      [class.bg-emerald-100]="status() === 'APPROVED'"
      [class.text-emerald-800]="status() === 'APPROVED'"
      [class.ring-emerald-200/80]="status() === 'APPROVED'"
      [class.bg-red-100]="status() === 'REJECTED'"
      [class.text-red-800]="status() === 'REJECTED'"
      [class.ring-red-200/80]="status() === 'REJECTED'"
      [class.bg-gray-100]="status() === 'CANCELLED'"
      [class.text-gray-600]="status() === 'CANCELLED'"
      [class.ring-gray-200/80]="status() === 'CANCELLED'"
      [class.bg-teal-100]="status() === 'COMPLETED'"
      [class.text-teal-800]="status() === 'COMPLETED'"
      [class.ring-teal-200/80]="status() === 'COMPLETED'"
      [class.bg-orange-100]="status() === 'CONFLICT'"
      [class.text-orange-800]="status() === 'CONFLICT'"
      [class.ring-orange-200/80]="status() === 'CONFLICT'"
    >{{ status() }}</span>
  `,
})
export class ReservationStatusPill {
  readonly status = input.required<string>();
}
