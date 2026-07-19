import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UiButton, UiIcon } from '../../../shared/ui';
import { ExportDateRange, ExportScope } from './reservation-export.util';

@Component({
  selector: 'app-reservation-export-modal',
  imports: [FormsModule, UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      (click)="closed.emit()"
    >
      <div
        class="animate-rise w-full max-w-md cursor-default rounded-2xl bg-white shadow-2xl"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Export {{ serviceName() }} Records</h3>
            <p class="mt-0.5 text-xs text-gray-500">Download reservations as CSV</p>
          </div>
          <button
            type="button"
            class="cursor-pointer rounded-full p-1 text-gray-500 hover:bg-gray-100"
            (click)="closed.emit()"
          >
            <ui-icon name="close" class="text-xl" />
          </button>
        </div>

        <div class="flex flex-col gap-4 p-5">
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="exportScope" [ngModel]="scope()" (ngModelChange)="setScope($event)" value="all" />
              <span class="text-sm font-medium text-gray-800">All records in the system</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="exportScope" [ngModel]="scope()" (ngModelChange)="setScope($event)" value="range" />
              <span class="text-sm font-medium text-gray-800">Date span</span>
            </label>
          </div>

          @if (scope() === 'range') {
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-400">From</label>
                <input
                  type="date"
                  class="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  [ngModel]="startDate()"
                  (ngModelChange)="startDate.set($event)"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-400">To</label>
                <input
                  type="date"
                  class="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  [ngModel]="endDate()"
                  (ngModelChange)="endDate.set($event)"
                />
              </div>
            </div>
          }

          @if (error()) {
            <p class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{{ error() }}</p>
          }

          <div class="flex justify-end gap-2">
            <button type="button" uiButton variant="secondary" (click)="closed.emit()">Cancel</button>
            <button type="button" uiButton (click)="confirm()">
              <ui-icon name="download" class="text-base" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReservationExportModal {
  readonly serviceName = input.required<string>();
  readonly closed = output<void>();
  readonly exported = output<ExportDateRange>();

  protected readonly scope = signal<ExportScope>('all');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly error = signal<string | null>(null);

  protected setScope(value: ExportScope): void {
    this.scope.set(value);
    this.error.set(null);
  }

  protected confirm(): void {
    if (this.scope() === 'range') {
      const start = this.startDate().trim();
      const end = this.endDate().trim();
      if (!start || !end) {
        this.error.set('Please select both start and end dates');
        return;
      }
      if (start > end) {
        this.error.set('Start date must be on or before end date');
        return;
      }
      this.exported.emit({ scope: 'range', startDate: start, endDate: end });
      return;
    }
    this.exported.emit({ scope: 'all' });
  }
}
