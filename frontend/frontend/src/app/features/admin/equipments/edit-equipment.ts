import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect, UiSelectOption } from '../../../shared/ui';
import { toFacilityOptions } from './equipment-facilities';
import { EQUIPMENT_STATUS_OPTIONS } from './equipment-status';
import { EquipmentsService } from './equipments.service';

@Component({
  selector: 'app-edit-equipment',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect],
  templateUrl: './edit-equipment.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditEquipment {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EquipmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly listPath = this.api.listPath();
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly ready = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly id = signal(0);
  protected readonly currentStatus = signal<string | null>(null);
  protected readonly facilities = signal<UiSelectOption[]>([]);

  protected readonly statuses = computed(() => {
    const current = this.currentStatus();

    if (!current || EQUIPMENT_STATUS_OPTIONS.some((status) => status.value === current)) {
      return EQUIPMENT_STATUS_OPTIONS;
    }

    return [{ label: current, value: current }, ...EQUIPMENT_STATUS_OPTIONS];
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    facilityId: ['', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.id.set(id);

    if (!id) {
      this.loading.set(false);
      this.error.set('Missing equipment id');
      return;
    }

    this.load(id);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      equipments: this.api.list(),
      facilities: this.api.listFacilities(),
    }).subscribe({
      next: ({ equipments, facilities }) => {
        this.loading.set(false);

        if (!equipments?.success) {
          this.error.set(equipments?.message ?? 'Failed to load equipment');
          return;
        }

        const equipment = (equipments.equipment ?? []).find((row) => row.id === id);

        if (!equipment) {
          this.error.set('Equipment not found');
          return;
        }

        this.currentStatus.set(equipment.status);
        this.facilities.set(toFacilityOptions(facilities ?? [], this.api.scope()));
        this.form.setValue({
          name: equipment.name ?? '',
          facilityId: String(equipment.facilityId),
          status: equipment.status,
        });
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
      this.error.set('Equipment details are not ready yet');
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
        name: v.name,
        facilityId: Number(v.facilityId),
        status: v.status,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);

          if (res?.success) {
            this.router.navigateByUrl(this.api.listPath());
          } else {
            this.error.set(res?.message ?? 'Failed to update equipment');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }
}
