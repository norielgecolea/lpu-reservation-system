import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  UiButton,
  UiDateSelector,
  UiIcon,
  UiInputSearch,
  UiSelect,
  UiSelectOption,
  UiToast,
} from '../../../shared/ui';
import {
  formatAuditActionLabel,
  formatAuditDetails,
  formatAuditTimestamp,
} from './audit-detail.util';
import {
  AUDIT_SERVICE_LABELS,
  AuditLogRow,
  AuditServiceCode,
} from './audit-logs.models';
import { AuditLogsService } from './audit-logs.service';
import { getCurrentYearMonth } from '../dashboard/dashboard-events.util';
import { ReservationExportModal } from '../reservations/reservation-export-modal';
import { ExportDateRange } from '../reservations/reservation-export.util';
import { exportAuditLogsCsv } from './audit-export.util';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-audit-logs',
  imports: [UiButton, UiDateSelector, UiIcon, UiInputSearch, UiSelect, UiToast, ReservationExportModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-none flex-col gap-4 md:min-h-0 md:flex-1' },
  template: `
    <section class="animate-rise flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-black text-gray-900">{{ serviceLabel() }} Audit</h1>
        <p class="mt-0.5 text-sm text-gray-500">Admin action history for {{ serviceLabel() }}</p>
      </div>
      <div class="text-sm text-gray-500">
        {{ totalCount() }} record{{ totalCount() === 1 ? '' : 's' }}
      </div>
    </section>

    <section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <ui-input-search
        class="w-full sm:min-w-48 sm:flex-1"
        [value]="search()"
        (valueChange)="onSearch($event)"
        placeholder="Search admin or target..."
      />
      <ui-select
        class="w-full sm:w-44 shrink-0"
        [value]="actionFilter()"
        (valueChange)="onActionFilter($any($event))"
        placeholder="All actions"
        [options]="actionFilterOptions()"
      />
      <ui-date-selector [value]="activeMonth()" (valueChange)="onMonthChange($event)" />
      <button
        type="button"
        (click)="exportOpen.set(true)"
        [disabled]="exporting()"
        class="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <ui-icon name="download" class="text-base" />
        <span class="hidden sm:inline">Export</span>
      </button>
    </section>

    <section
      class="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)] ring-1 ring-inset ring-white/60 backdrop-blur-xl backdrop-saturate-150"
    >
      <div class="min-h-0 flex-1 overflow-auto">
        <table class="hidden w-full min-w-200 border-collapse text-left text-sm md:table">
          <thead class="sticky top-0 z-10">
            <tr class="bg-primary text-xs font-bold uppercase tracking-wide text-white">
              <th class="px-5 py-4">Date &amp; Time</th>
              <th class="px-4 py-3">Action</th>
              <th class="px-4 py-3">Admin</th>
              <th class="px-4 py-3">Target</th>
              <th class="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              @for (row of [1, 2, 3, 4, 5]; track row) {
                <tr class="border-b border-gray-100">
                  @for (col of [1, 2, 3, 4, 5]; track col) {
                    <td class="px-4 py-4">
                      <div class="h-4 animate-pulse rounded bg-gray-200"></div>
                    </td>
                  }
                </tr>
              }
            } @else if (error()) {
              <tr>
                <td colspan="5" class="px-4 py-8 text-center text-red-600">{{ error() }}</td>
              </tr>
            } @else if (logs().length === 0) {
              <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                  No audit records yet for this service.
                </td>
              </tr>
            } @else {
              @for (log of logs(); track log.id) {
                <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50/70 hover:bg-secondary/5">
                  <td class="whitespace-nowrap px-5 py-4 text-black">
                    {{ formatTime(log.performedAt) }}
                  </td>
                  <td class="px-4 py-3">
                    <span [class]="actionBadgeClass(log.actionType)">
                      {{ formatAction(log.actionType) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-black">
                    <div class="font-semibold">{{ log.adminFullname || log.adminUsername }}</div>
                    <div class="text-xs text-gray-500">{{ log.adminUsername }}</div>
                  </td>
                  <td class="px-4 py-3 text-black">
                    @if (log.targetLabel) {
                      <div>{{ log.targetLabel }}</div>
                    }
                    @if (log.targetId) {
                      <div class="text-xs text-gray-500">#{{ log.targetId }}</div>
                    }
                  </td>
                  <td class="max-w-xs px-4 py-3 text-xs text-gray-600">
                    {{ formatDetails(log.actionType, log.details) }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div class="flex flex-col gap-3 p-3 md:hidden">
          @if (loading()) {
            @for (row of [1, 2, 3]; track row) {
              <div class="animate-pulse rounded-xl border border-gray-100 bg-white p-4">
                <div class="mb-2 h-4 w-32 rounded bg-gray-200"></div>
                <div class="h-3 w-full rounded bg-gray-200"></div>
              </div>
            }
          } @else if (error()) {
            <p class="py-8 text-center text-red-600">{{ error() }}</p>
          } @else if (logs().length === 0) {
            <p class="py-8 text-center text-gray-500">No audit records yet for this service.</p>
          } @else {
            @for (log of logs(); track log.id) {
              <article class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div class="mb-2 flex items-start justify-between gap-2">
                  <span [class]="actionBadgeClass(log.actionType)">
                    {{ formatAction(log.actionType) }}
                  </span>
                  <time class="text-xs text-gray-500">{{ formatTime(log.performedAt) }}</time>
                </div>
                <p class="text-sm font-semibold text-gray-900">
                  {{ log.adminFullname || log.adminUsername }}
                </p>
                <p class="text-xs text-gray-500">{{ log.adminUsername }}</p>
                @if (log.targetLabel || log.targetId) {
                  <p class="mt-2 text-sm text-gray-800">
                    {{ log.targetLabel }}@if (log.targetId) { <span class="text-gray-500"> #{{ log.targetId }}</span> }
                  </p>
                }
                <p class="mt-2 text-xs text-gray-600">
                  {{ formatDetails(log.actionType, log.details) }}
                </p>
              </article>
            }
          }
        </div>
      </div>

      @if (totalPages() > 1) {
        <div class="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            uiButton
            variant="secondary"
            [disabled]="page() === 0 || loading()"
            (click)="prevPage()"
          >
            Previous
          </button>
          <span class="text-sm text-gray-600">Page {{ page() + 1 }} of {{ totalPages() }}</span>
          <button
            type="button"
            uiButton
            variant="secondary"
            [disabled]="page() >= totalPages() - 1 || loading()"
            (click)="nextPage()"
          >
            Next
          </button>
        </div>
      }
    </section>

    <ui-toast [message]="toast()" (dismissed)="toast.set('')" />
    @if (exportOpen()) {
      <app-reservation-export-modal
        [serviceName]="serviceLabel()"
        (closed)="exportOpen.set(false)"
        (exported)="runExport($event)"
      />
    }
  `,
})
export class AuditLogs implements OnInit {
  private readonly api = inject(AuditLogsService);
  private readonly route = inject(ActivatedRoute);

  protected readonly logs = signal<AuditLogRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly actionFilter = signal('All');
  protected readonly toast = signal('');
  protected readonly exportOpen = signal(false);
  protected readonly exporting = signal(false);
  protected readonly activeMonth = signal(getCurrentYearMonth());
  protected readonly page = signal(0);
  protected readonly totalCount = signal(0);
  protected readonly actionTypes = signal<string[]>([]);

  protected readonly serviceCode = computed<AuditServiceCode>(() => {
    const routeService = this.route.snapshot.data['service'];
    return (routeService as AuditServiceCode) ?? 'FLT';
  });

  protected readonly serviceLabel = computed(
    () => AUDIT_SERVICE_LABELS[this.serviceCode()] ?? this.serviceCode(),
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / PAGE_SIZE)),
  );

  protected readonly actionFilterOptions = computed<UiSelectOption[]>(() => {
    const opts: UiSelectOption[] = [{ label: 'All actions', value: 'All' }];
    for (const t of this.actionTypes()) {
      opts.push({ label: formatAuditActionLabel(t), value: t });
    }
    return opts;
  });

  protected readonly formatTime = formatAuditTimestamp;
  protected readonly formatAction = formatAuditActionLabel;
  protected readonly formatDetails = formatAuditDetails;

  ngOnInit(): void {
    this.loadActionTypes();
    this.load();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.load();
  }

  protected onActionFilter(value: string): void {
    this.actionFilter.set(value);
    this.page.set(0);
    this.load();
  }

  protected onMonthChange(value: string): void {
    this.activeMonth.set(value);
    this.page.set(0);
    this.load();
  }

  protected prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  protected nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  protected actionBadgeClass(actionType: string): string {
    const base = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold';
    switch (actionType) {
      case 'APPROVE':
      case 'CREATE':
        return `${base} bg-emerald-100 text-emerald-800`;
      case 'REJECTED':
      case 'REJECT':
      case 'DELETE':
        return `${base} bg-red-100 text-red-800`;
      case 'RESCHEDULE':
      case 'COORDINATION_SET':
      case 'UPDATE':
        return `${base} bg-blue-100 text-blue-800`;
      case 'CANCELLED':
      case 'CANCEL':
        return `${base} bg-amber-100 text-amber-800`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  }

  private loadActionTypes(): void {
    this.api.actionTypes(this.serviceCode()).subscribe({
      next: (res) => {
        if (res?.success && res.actionTypes) {
          this.actionTypes.set(res.actionTypes);
        }
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const actionType = this.actionFilter() === 'All' ? undefined : this.actionFilter();
    const month = this.activeMonth();
    const fromDate = `${month}-01`;
    const year = Number(month.slice(0, 4));
    const mm = Number(month.slice(5, 7));
    const lastDay = new Date(year, mm, 0).getDate(); // month is 1-based
    const toDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    this.api
      .list({
        service: this.serviceCode(),
        page: this.page(),
        size: PAGE_SIZE,
        actionType,
        search: this.search() || undefined,
        fromDate,
        toDate,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res?.success) {
            this.logs.set(res.logs ?? []);
            this.totalCount.set(res.totalCount ?? 0);
          } else {
            this.error.set(res?.message ?? 'Failed to load audit logs');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }

  protected async runExport(range: ExportDateRange): Promise<void> {
    this.exportOpen.set(false);
    this.exporting.set(true);
    try {
      const service = this.serviceCode();
      const pageSize = 500;
      const fromDate = range.scope === 'range' ? range.startDate : undefined;
      const toDate = range.scope === 'range' ? range.endDate : undefined;

      const all: AuditLogRow[] = [];
      let page = 0;

      while (true) {
        const res = await firstValueFrom(
          this.api.list({
            service,
            page,
            size: pageSize,
            actionType: undefined,
            search: undefined,
            fromDate,
            toDate,
          }),
        );

        if (!res?.success) {
          throw new Error(res?.message ?? 'Failed to fetch audit logs for export');
        }

        all.push(...(res.logs ?? []));

        const total = res.totalCount ?? 0;
        if (all.length >= total || (res.logs?.length ?? 0) < pageSize) break;
        page++;
      }

      exportAuditLogsCsv(all, range, this.serviceLabel());
      this.toast.set(`${this.serviceLabel()} audit logs exported to CSV`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to export audit logs';
      this.toast.set(message);
    } finally {
      this.exporting.set(false);
    }
  }
}
