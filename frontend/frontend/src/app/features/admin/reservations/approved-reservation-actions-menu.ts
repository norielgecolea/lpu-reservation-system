import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

import { UiIcon } from '../../../shared/ui';

/** Collapsible action menu for APPROVED reservation rows in admin approver lists. */
@Component({
  selector: 'app-approved-reservation-actions-menu',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-end">
      @if (!expanded()) {
        <button
          type="button"
          (click)="open($event)"
          [disabled]="disabled()"
          class="flex items-center gap-1 rounded-lg bg-gray-100 border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ui-icon name="more_horiz" class="text-sm" />
          Actions
        </button>
      } @else {
        <div class="flex items-center justify-end gap-1.5 flex-wrap max-sm:w-full max-sm:flex-col max-sm:items-stretch">
          <ng-content />
          <button
            type="button"
            (click)="close($event)"
            aria-label="Hide actions"
            title="Hide actions"
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <ui-icon name="expand_less" class="text-base" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ApprovedReservationActionsMenu {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly rowId = input.required<number>();
  readonly expanded = input(false);
  readonly disabled = input(false);
  readonly expandedChange = output<boolean>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.expanded()) return;
    const target = event.target;
    if (target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.expandedChange.emit(false);
    }
  }

  protected open(event: Event): void {
    event.stopPropagation();
    this.expandedChange.emit(true);
  }

  protected close(event: Event): void {
    event.stopPropagation();
    this.expandedChange.emit(false);
  }
}
