import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect } from '../../../shared/ui';
import { normalizeVehicleStatus, VEHICLE_STATUS_OPTIONS } from './vehicle-status';
import { VAN_FACILITY_ID } from './vehicles.models';
import { VehiclesService } from './vehicles.service';

@Component({
  selector: 'app-edit-vehicle',
  imports: [
    ReactiveFormsModule,
    RouterLink, UiButton,
    UiFormFeedback,
    UiIcon,
    UiInput,
    UiSelect],
  templateUrl: './edit-vehicle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditVehicle implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(VehiclesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly listPath = this.api.listPath();
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly ready = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly id = signal(0);
  protected readonly facilityId = signal(VAN_FACILITY_ID);
  protected readonly currentStatus = signal<string | null>(null);
  protected readonly imagePreview = signal<string | null>(null);
  private imageObjectUrl: string | null = null;

  protected readonly statuses = computed(() => {
    const current = this.currentStatus();

    if (!current || VEHICLE_STATUS_OPTIONS.some((status) => status.value === current)) {
      return VEHICLE_STATUS_OPTIONS;
    }

    return [{ label: current.toUpperCase(), value: current }, ...VEHICLE_STATUS_OPTIONS];
  });

  protected readonly form = this.fb.nonNullable.group({
    brand: ['', [Validators.required]],
    plate_num: ['', [Validators.required]],
    capacity: [1, [Validators.required, Validators.min(1)]],
    status: ['AVAILABLE', [Validators.required]],
    vehicleDescription: ['', [Validators.required]],
    image: [null as File | null],
  });

  protected onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.form.controls.image.setValue(file);
    this.setImagePreview(file ? URL.createObjectURL(file) : null, Boolean(file));
  }

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.id.set(id);

    if (!id) {
      this.loading.set(false);
      this.error.set('Missing vehicle id');
      return;
    }

    this.load(id);
  }

  ngOnDestroy(): void {
    this.revokeImageObjectUrl();
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (vehicles) => {
        this.loading.set(false);

        if (!vehicles?.success) {
          this.error.set(vehicles?.message ?? 'Failed to load vehicle');
          return;
        }

        const vehicle = (vehicles.equipment ?? vehicles.vehicles ?? []).find(
          (row) => row.id === id,
        );

        if (!vehicle) {
          this.error.set('Vehicle not found');
          return;
        }

        this.currentStatus.set(normalizeVehicleStatus(vehicle.status));
        this.facilityId.set(vehicle.facilityId || VAN_FACILITY_ID);
        this.form.setValue({
          brand: vehicle.brand ?? '',
          plate_num: vehicle.plate_num ?? '',
          capacity: Number(vehicle.capacity ?? 1),
          status: normalizeVehicleStatus(vehicle.status),
          vehicleDescription: vehicle.vehicleDescription ?? '',
          image: null,
        });
        this.setImagePreview(
          this.api.imageUrl(
            vehicle.image ??
              vehicle.vehicleImage ??
              vehicle.imageUrl ??
              vehicle.imagePath ??
              vehicle.photo,
          ),
        );
        this.ready.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected save(): void {
    if (!this.ready()) {
      this.error.set('Vehicle details are not ready yet');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete all required fields');
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.api
      .update({
        id: this.id(),
        facilityId: this.facilityId(),
        brand: v.brand,
        plate_num: v.plate_num,
        capacity: Number(v.capacity),
        vehicleDescription: v.vehicleDescription,
        status: v.status,
        image: v.image,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);

          if (res?.success) {
            this.router.navigateByUrl(this.api.listPath());
          } else {
            this.error.set(res?.message ?? 'Failed to update vehicle');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(this.requestErrorMessage(err));
        },
      });
  }

  private requestErrorMessage(err: any): string {
    const error = err?.error;

    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error;
    }

    if (err?.status) {
      return `Request failed (${err.status}${err.statusText ? ` ${err.statusText}` : ''})`;
    }

    return 'Unable to reach the server';
  }

  private setImagePreview(value: string | null, isObjectUrl = false): void {
    this.revokeImageObjectUrl();
    this.imageObjectUrl = isObjectUrl ? value : null;
    this.imagePreview.set(value);
  }

  private revokeImageObjectUrl(): void {
    if (!this.imageObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.imageObjectUrl);
    this.imageObjectUrl = null;
  }
}
