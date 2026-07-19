import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput } from '../../../shared/ui';
import { FacilitiesUsersService } from './facilities-users.service';

@Component({
  selector: 'app-facilities-edit-user',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<form [formGroup]="form" (ngSubmit)="save()" autocomplete="off"
        class="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/45 backdrop-blur-xl ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)]">

    <div class="mx-5 border-b border-primary/30 py-3.5 sm:mx-7">
      <div class="flex items-center gap-3 text-primary">
        <ui-icon name="edit_square" class="text-2xl" />
        <div>
          <h2 class="text-xl font-black">Edit User</h2>
          <p class="text-xs text-gray-500">Updates a Facilities Admin account</p>
        </div>
      </div>
    </div>

    <ui-form-feedback [saving]="saving()" savingText="Saving changes..." [error]="error()" (dismissed)="error.set(null)" />

    <div class="flex-1 overflow-y-auto p-5 lg:p-7">
      @if (loading()) {
        <div class="py-10 text-center text-sm text-gray-500">Loading user...</div>
      } @else if (ready()) {
        <div class="grid content-start gap-5 sm:grid-cols-2">

          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="fe-fullname" class="text-sm font-bold text-gray-800">Full Name</label>
            <input uiInput id="fe-fullname" type="text" formControlName="fullname" autocomplete="off" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="fe-empid" class="text-sm font-bold text-gray-800">Employee ID</label>
            <input uiInput id="fe-empid" type="text" formControlName="employeeId" autocomplete="off" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="fe-email" class="text-sm font-bold text-gray-800">Email</label>
            <input uiInput id="fe-email" type="email" formControlName="email" autocomplete="off" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="fe-username" class="text-sm font-bold text-gray-800">Username</label>
            <input uiInput id="fe-username" type="text" formControlName="username" autocomplete="off" />
          </div>

          <!-- Role locked badge -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-bold text-gray-800">Role</label>
            <div class="flex h-10 items-center rounded-lg border border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary">
              <ui-icon name="admin_panel_settings" class="mr-2 text-base" />
              FACILITIES ADMIN
            </div>
          </div>

        </div>
      }
    </div>

    <div class="mx-5 mt-auto flex flex-col-reverse gap-3 border-t border-primary/30 py-3 sm:mx-7 sm:flex-row sm:justify-end">
      <a uiButton variant="secondary" routerLink="/facilities/users">CANCEL</a>
      <button uiButton type="submit" [disabled]="loading() || saving() || !ready()">SAVE</button>
    </div>
  </form>
`,
})
export class FacilitiesEditUser {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(FacilitiesUsersService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly saving  = signal(false);
  protected readonly error   = signal<string | null>(null);
  private readonly empId     = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly ready   = computed(() => !this.loading() && this.form.value.fullname !== '');

  protected readonly form = this.fb.nonNullable.group({
    fullname:   ['', [Validators.required]],
    employeeId: ['', [Validators.required]],
    email:      ['', [Validators.required, Validators.email]],
    username:   ['', [Validators.required]],
  });

  constructor() {
    this.api.get(this.empId).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res?.success) {
          this.error.set(res?.message ?? 'Failed to load user');
          return;
        }
        const user = (res.users ?? [])[0];
        if (!user) {
          this.error.set('User not found');
          return;
        }
        this.form.patchValue({
          fullname:   user.fullname,
          employeeId: user.employeeId,
          email:      user.email,
          username:   user.username,
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error.set('Please complete all required fields'); return; }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.update({
      oldEmployeeId: this.empId,
      employeeId:    v.employeeId,
      fullname:      v.fullname,
      username:      v.username,
      email:         v.email,
      role:          'FACILITIESADMIN',
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res?.success) this.router.navigateByUrl('/facilities/users');
        else this.error.set(res?.message ?? 'Failed to update account');
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'Server error'); },
    });
  }
}
