import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay';
import { DomPortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { UiIcon } from '../../../shared/ui';

/** Actions trigger that opens a floating vertical menu (does not expand the table row). */
@Component({
  selector: 'app-approved-reservation-actions-menu',
  imports: [UiIcon, OverlayModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex justify-end' },
  template: `
    <button
      #trigger
      type="button"
      (click)="toggle($event)"
      [disabled]="disabled()"
      [attr.aria-expanded]="menuOpen()"
      aria-haspopup="menu"
      class="inline-flex items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm shadow-gray-200/60 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ui-icon name="more_horiz" class="text-sm" />
      Actions
    </button>

    <div
      #panel
      role="menu"
      class="hidden min-w-48 max-w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-1 rounded-2xl bg-white/95 p-1.5 shadow-xl shadow-gray-900/15 ring-1 ring-black/8 backdrop-blur-md [&_button]:w-full [&_button]:justify-start"
      (click)="onPanelClick($event)"
    >
      <ng-content />
    </div>
  `,
})
export class ApprovedReservationActionsMenu implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private overlayRef: OverlayRef | null = null;

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  readonly disabled = input(false);
  protected readonly menuOpen = signal(false);

  ngOnDestroy(): void {
    this.close();
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (this.menuOpen()) {
      this.close();
      return;
    }
    this.open();
  }

  private open(): void {
    this.close();
    const panelEl = this.panel().nativeElement;
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.trigger())
        .withFlexibleDimensions(false)
        .withPush(true)
        .withPositions([
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 6,
          },
          {
            originX: 'end',
            originY: 'top',
            overlayX: 'end',
            overlayY: 'bottom',
            offsetY: -6,
          },
        ]),
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      disposeOnNavigation: true,
    });
    overlayRef.backdropClick().subscribe(() => this.close());
    overlayRef.attachments().subscribe(() => {
      panelEl.classList.remove('hidden');
      panelEl.classList.add('flex');
    });
    overlayRef.detachments().subscribe(() => {
      panelEl.classList.add('hidden');
      panelEl.classList.remove('flex');
    });
    overlayRef.attach(new DomPortal(panelEl));
    this.overlayRef = overlayRef;
    this.menuOpen.set(true);
  }

  private close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.menuOpen.set(false);
  }

  protected onPanelClick(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button')) {
      this.close();
    }
  }
}
