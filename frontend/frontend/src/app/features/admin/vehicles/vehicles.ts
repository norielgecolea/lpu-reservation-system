import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkMenuModule } from '@angular/cdk/menu';
import {
  UiButton,
  UiIcon,
  UiInputSearch,
  UiSegmented,
  UiStatusBadge,
  UiToast,
} from '../../../shared/ui';
import { PopulateVehiclesResponse, VehicleRow } from './vehicles.models';
import { VehiclesService } from './vehicles.service';

type SortField = 'plate_num' | 'brand' | 'facilityName' | 'capacity' | 'status';
type ViewMode = 'Grid' | 'Table';

@Component({
  selector: 'app-vehicles',
  imports: [
    RouterLink, UiButton,
    UiIcon,
    UiInputSearch,
    UiSegmented,
    UiStatusBadge,
    UiToast,
    CdkMenuModule],
  templateUrl: './vehicles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vehicles {
  private readonly api = inject(VehiclesService);

  protected readonly vehicles = signal<VehicleRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly toastSuccess = signal(false);
  protected readonly viewModes: ViewMode[] = ['Grid', 'Table'];
  protected readonly viewMode = signal<ViewMode>('Grid');
  protected readonly sortField = signal<SortField>('plate_num');
  protected editPath(id: number): string {
    return `${this.listPath}/${id}/edit`;
  }

  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly listPath = this.api.listPath();
  protected readonly newPath = `${this.listPath}/new`;
  protected readonly selectedImage = signal<{ url: string; label: string } | null>(null);

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    let rows = this.vehicles();

    if (q) {
      rows = rows.filter((vehicle) =>
        [
          vehicle.plate_num,
          vehicle.brand,
          vehicle.facilityName,
          vehicle.vehicleDescription,
          String(vehicle.capacity),
          vehicle.status].some((field) => field?.toLowerCase().includes(q)),
      );
    }

    const field = this.sortField();
    const direction = this.sortDirection();

    return [...rows].sort((a, b) => {
      const comparison =
        field === 'capacity'
          ? Number(a.capacity ?? 0) - Number(b.capacity ?? 0)
          : (a[field] ?? '')
              .toString()
              .toLowerCase()
              .localeCompare((b[field] ?? '').toString().toLowerCase());

      return direction === 'asc' ? comparison : -comparison;
    });
  });

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
          this.vehicles.set(this.rowsFrom(res));
        } else {
          this.error.set(res?.message ?? 'Failed to load vehicles');
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

  protected selectViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected sortBy(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
  }

  protected vehicleImageUrl(vehicle: VehicleRow): string | null {
    return this.api.imageUrl(
      vehicle.image ??
        vehicle.vehicleImage ??
        vehicle.imageUrl ??
        vehicle.imagePath ??
        vehicle.photo,
    );
  }

  protected openImage(vehicle: VehicleRow): void {
    const url = this.vehicleImageUrl(vehicle);

    if (!url) {
      return;
    }

    this.selectedImage.set({
      url,
      label: vehicle.plate_num || vehicle.brand || 'Vehicle image',
    });
  }

  protected closeImage(): void {
    this.selectedImage.set(null);
  }

  protected remove(vehicle: VehicleRow): void {
    const label = vehicle.plate_num || vehicle.brand || 'this vehicle';
    if (
      !confirm(
        `Are you sure you want to delete "${label}"?\n\nAny van reservations linked to this vehicle will have their vehicle assignment cleared. This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.api.remove(vehicle.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');

        if (res?.success) {
          this.vehicles.update((rows) => rows.filter((row) => row.id !== vehicle.id));
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

  protected toggleStatus(vehicle: VehicleRow): void {
    const action = this.isActive(vehicle.status) ? 'deactivate' : 'activate';

    if (!confirm(`Are you sure you want to ${action} "${vehicle.plate_num}"?`)) {
      return;
    }

    this.api.toggleStatus(vehicle.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');

        if (res?.success) {
          this.vehicles.update((rows) =>
            rows.map((row) =>
              row.id === vehicle.id
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

  private rowsFrom(res: PopulateVehiclesResponse): VehicleRow[] {
    return res.equipment ?? res.vehicles ?? [];
  }
}
