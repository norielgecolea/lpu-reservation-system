import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ui-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase"
      [class.bg-green-100]="isActive()"
      [class.text-green-700]="isActive()"
      [class.bg-red-100]="!isActive()"
      [class.text-red-600]="!isActive()"
    >
      {{ status() }}
    </span>
  `,
})
export class UiStatusBadge {
  readonly status = input('');

  private static readonly ACTIVE = new Set(['ACTIVE', 'AVAILABLE']);

  protected readonly isActive = computed(() =>
    UiStatusBadge.ACTIVE.has(this.status().toUpperCase()),
  );
}
