import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface ApproverStatusChip {
  value: string;
  label: string;
  count: number;
  tone: 'neutral' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'conflict';
}

/** Clickable status filter chips with counts for admin reservation approver lists. */
@Component({
  selector: 'app-reservation-approver-status-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      @for (chip of chips(); track chip.value) {
        <button
          type="button"
          (click)="value.set(chip.value)"
          class="inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
          [class]="chipClasses(chip)"
          [attr.aria-pressed]="value() === chip.value"
        >
          <span
            class="h-2 w-2 rounded-full"
            [class.bg-gray-400]="chip.tone === 'neutral'"
            [class.bg-amber-500]="chip.tone === 'pending'"
            [class.bg-emerald-500]="chip.tone === 'approved'"
            [class.bg-red-500]="chip.tone === 'rejected'"
            [class.bg-gray-500]="chip.tone === 'cancelled'"
            [class.bg-teal-500]="chip.tone === 'completed'"
            [class.bg-orange-500]="chip.tone === 'conflict'"
          ></span>
          <span>{{ chip.label }}</span>
          <span
            class="inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums"
            [class]="countClasses(chip)"
          >{{ chip.count }}</span>
        </button>
      }
    </div>
  `,
})
export class ReservationApproverStatusChips {
  readonly chips = input.required<ApproverStatusChip[]>();
  readonly value = model.required<string>();

  protected chipClasses(chip: ApproverStatusChip): string {
    const active = this.value() === chip.value;
    if (active) {
      switch (chip.tone) {
        case 'pending':
          return 'border-amber-300 bg-amber-50 text-amber-900 shadow-sm shadow-amber-100/80';
        case 'approved':
          return 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-100/80';
        case 'rejected':
          return 'border-red-300 bg-red-50 text-red-900 shadow-sm shadow-red-100/80';
        case 'cancelled':
          return 'border-gray-300 bg-gray-100 text-gray-800 shadow-sm';
        case 'completed':
          return 'border-teal-300 bg-teal-50 text-teal-900 shadow-sm shadow-teal-100/80';
        case 'conflict':
          return 'border-orange-300 bg-orange-50 text-orange-900 shadow-sm shadow-orange-100/80';
        default:
          return 'border-primary/30 bg-primary/10 text-primary shadow-sm shadow-primary/10';
      }
    }
    return 'border-gray-200/80 bg-white/70 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900';
  }

  protected countClasses(chip: ApproverStatusChip): string {
    const active = this.value() === chip.value;
    if (active) {
      switch (chip.tone) {
        case 'pending':
          return 'bg-amber-500/15 text-amber-800';
        case 'approved':
          return 'bg-emerald-500/15 text-emerald-800';
        case 'rejected':
          return 'bg-red-500/15 text-red-800';
        case 'cancelled':
          return 'bg-gray-500/15 text-gray-700';
        case 'completed':
          return 'bg-teal-500/15 text-teal-800';
        case 'conflict':
          return 'bg-orange-500/15 text-orange-800';
        default:
          return 'bg-primary/15 text-primary';
      }
    }
    return 'bg-gray-100 text-gray-500';
  }
}
