import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect, UiSelectOption } from '../../../shared/ui';
import { toFacilityOptions } from './equipment-facilities';
import { EQUIPMENT_STATUS_OPTIONS } from './equipment-status';
import { EquipmentsService } from './equipments.service';

@Component({
  selector: 'app-add-equipment',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect],
  templateUrl: './add-equipment.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEquipment {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EquipmentsService);
  private readonly router = inject(Router);

  protected readonly listPath = this.api.listPath();
  protected readonly statuses = EQUIPMENT_STATUS_OPTIONS;
  protected readonly facilities = signal<UiSelectOption[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    facilityId: ['', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
  });

  constructor() {
    this.api.listFacilities().subscribe({
      next: (facilities) => {
        this.facilities.set(toFacilityOptions(facilities ?? [], this.api.scope()));
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Unable to load services');
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please complete all required fields');
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.api
      .create({
        name: v.name,
        id: Number(v.facilityId),
        status: v.status,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);

          if (res?.success) {
            this.router.navigateByUrl(this.api.listPath());
          } else {
            this.error.set(res?.message ?? 'Failed to create equipment');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }
}
