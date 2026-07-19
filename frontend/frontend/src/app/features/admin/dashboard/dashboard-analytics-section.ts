import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { UiIcon } from '../../../shared/ui';
import { MaintenanceBlock } from '../maintenance/maintenance.service';
import {
  buildDashboardAnalytics,
  eventMixBarClass,
  formatMonthLabel,
  formatTurnaround,
  statusBarClass,
  statusLabel,
} from './dashboard-analytics.util';
import {
  DashboardEvent,
  DashboardReservationRecord,
  DashboardService,
  isServiceImplemented,
} from './dashboard-events.util';

@Component({
  selector: 'app-dashboard-analytics-section',
  imports: [UiIcon],
  templateUrl: './dashboard-analytics-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAnalyticsSection {
  readonly activeService = input.required<DashboardService>();
  readonly activeDate = input.required<string>();
  readonly records = input.required<DashboardReservationRecord[]>();
  readonly maintenance = input<MaintenanceBlock[]>([]);
  readonly events = input.required<DashboardEvent[]>();
  readonly loading = input(false);

  protected readonly isComingSoon = computed(
    () => !isServiceImplemented(this.activeService()),
  );

  protected readonly analytics = computed(() =>
    buildDashboardAnalytics(
      this.records(),
      this.events(),
      this.maintenance(),
      this.activeService(),
      this.activeDate(),
    ),
  );

  protected readonly fltAnalytics = computed(() => {
    const spec = this.analytics().facilitySpecific;
    return spec.kind === 'FLT' ? spec : null;
  });

  protected readonly gymAnalytics = computed(() => {
    const spec = this.analytics().facilitySpecific;
    return spec.kind === 'Gymnasium' ? spec : null;
  });

  protected readonly vanAnalytics = computed(() => {
    const spec = this.analytics().facilitySpecific;
    return spec.kind === 'VAN' ? spec : null;
  });

  protected readonly monthLabel = computed(() => formatMonthLabel(this.activeDate()));
  protected readonly statusLabel = statusLabel;
  protected readonly statusBarClass = statusBarClass;
  protected readonly eventMixBarClass = eventMixBarClass;
  protected readonly formatTurnaround = formatTurnaround;
  protected readonly Math = Math;
}
