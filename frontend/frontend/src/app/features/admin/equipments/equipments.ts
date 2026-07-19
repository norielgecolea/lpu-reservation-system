import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  UiButton,
  UiIcon,
  UiInputSearch,
  UiSegmented,
  UiStatusBadge,
  UiToast,
} from '../../../shared/ui';
import { EquipmentRow } from './equipments.models';
import { EquipmentsService } from './equipments.service';

const ADMIN_SERVICE_FILTERS = ['All', 'FLT', 'Gym', 'Boardroom', 'Nexus', 'Conference'] as const;
const FACILITIES_SERVICE_FILTERS = ['All', 'FLT', 'Gym'] as const;
type ServiceFilter = (typeof ADMIN_SERVICE_FILTERS)[number] | (typeof FACILITIES_SERVICE_FILTERS)[number];

@Component({
  selector: 'app-equipments',
  imports: [
    RouterLink, UiButton,
    UiIcon,
    UiInputSearch,
    UiSegmented,
    UiStatusBadge,
    UiToast],
  templateUrl: './equipments.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipments {
  private readonly api = inject(EquipmentsService);

  protected readonly equipments = signal<EquipmentRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly toastSuccess = signal(false);
  protected readonly scope = this.api.scope();
  protected readonly listPath = this.api.listPath();
  protected readonly newPath = `${this.listPath}/new`;
  protected readonly serviceFilters: ServiceFilter[] = this.scope === 'facilities'
    ? [...FACILITIES_SERVICE_FILTERS]
    : [...ADMIN_SERVICE_FILTERS];
  protected readonly activeService = signal<ServiceFilter>('All');
  protected readonly sortField = signal<'name' | 'facilityName' | 'status'>('name');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const service = this.activeService().toLowerCase();

    let rows = this.equipments();

    if (service !== 'all') {
      rows = rows.filter((equipment) =>
        equipment.facilityName?.toLowerCase().includes(service),
      );
    }

    if (q) {
      rows = rows.filter((equipment) =>
        [equipment.name, equipment.facilityName, equipment.status].some((field) =>
          field?.toLowerCase().includes(q),
        ),
      );
    }

    const field = this.sortField();
    const direction = this.sortDirection();

    return [...rows].sort((a, b) => {
      const valueA = (a[field] ?? '').toString().toLowerCase();
      const valueB = (b[field] ?? '').toString().toLowerCase();

      const comparison = valueA.localeCompare(valueB);

      return direction === 'asc' ? comparison : -comparison;
    });
  });

  protected editPath(id: number): string {
    return `${this.listPath}/${id}/edit`;
  }

  protected selectService(service: ServiceFilter): void {
    this.activeService.set(service);
  }

  protected sortBy(field: 'name' | 'facilityName' | 'status'): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }
  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (res) => {
        this.loading.set(false);

        if (res?.success) {
          this.equipments.set(res.equipment ?? []);
        } else {
          this.error.set(res?.message ?? 'Failed to load equipments');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected remove(equipment: EquipmentRow): void {
    if (!confirm(`Delete equipment "${equipment.name}"? This cannot be undone.`)) {
      return;
    }

    this.api.remove(equipment.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');

        if (res?.success) {
          this.equipments.update((rows) => rows.filter((row) => row.id !== equipment.id));
        }
      },
      error: (err) => {
        this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected isActive(status: string): boolean {
    return status?.toUpperCase() === 'AVAILABLE';
  }

  protected toggleStatus(equipment: EquipmentRow): void {
    const action = this.isActive(equipment.status) ? 'deactivate' : 'activate';

    if (!confirm(`Are you sure you want to ${action} "${equipment.name}"?`)) {
      return;
    }

    this.api.toggleStatus(equipment.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');

        if (res?.success) {
          this.equipments.update((rows) =>
            rows.map((row) =>
              row.id === equipment.id
                ? {
                    ...row,
                    status: this.isActive(row.status) ? 'UNAVAILABLE' : 'AVAILABLE',
                  }
                : row,
            ),
          );
        }
      },
      error: (err) => {
        this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected showResponse(success: boolean, message: string): void {
    this.toastSuccess.set(success);
    this.toastMessage.set(message);
    this.showToast.set(true);

    setTimeout(() => this.showToast.set(false), 3000);
  }
}
