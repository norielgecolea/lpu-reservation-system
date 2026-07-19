import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput } from '../../../shared/ui';
import { FacilitiesUsersService } from './facilities-users.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-facilities-add-user',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<form [formGroup]="form" (ngSubmit)="save()" autocomplete="off"
        class="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/45 backdrop-blur-xl ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)]">

    <div class="mx-5 border-b border-primary/30 py-3.5 sm:mx-7">
      <div class="flex items-center gap-3 text-primary">
        <ui-icon name="person_add" class="text-2xl" />
        <div>
          <h2 class="text-xl font-black">Add User</h2>
          <p class="text-xs text-gray-500">Creates a Facilities Admin account</p>
        </div>
      </div>
    </div>

    <ui-form-feedback [saving]="saving()" savingText="Creating account..." [error]="error()" (dismissed)="error.set(null)" />

    <div class="flex-1 overflow-y-auto p-5 lg:p-7">
      <div class="grid content-start gap-5 sm:grid-cols-2">

        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label for="fa-fullname" class="text-sm font-bold text-gray-800">Full Name</label>
          <input uiInput id="fa-fullname" type="text" formControlName="fullname" autocomplete="off" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="fa-empid" class="text-sm font-bold text-gray-800">Employee ID</label>
          <input uiInput id="fa-empid" type="text" formControlName="employeeId" autocomplete="off" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="fa-email" class="text-sm font-bold text-gray-800">Email</label>
          <input uiInput id="fa-email" type="email" formControlName="email" autocomplete="off" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="fa-username" class="text-sm font-bold text-gray-800">Username</label>
          <input uiInput id="fa-username" type="text" formControlName="username" autocomplete="off" />
        </div>

        <!-- Role locked badge -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-bold text-gray-800">Role</label>
          <div class="flex h-10 items-center rounded-lg border border-primary/40 bg-primary/5 px-3 text-sm font-semibold text-primary">
            <ui-icon name="admin_panel_settings" class="mr-2 text-base" />
            FACILITIES ADMIN
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="fa-password" class="text-sm font-bold text-gray-800">Password</label>
          <div class="relative">
            <input uiInput id="fa-password" [type]="showPw() ? 'text' : 'password'"
                   formControlName="password" autocomplete="new-password" class="pr-10" />
            <button type="button" (click)="showPw.set(!showPw())"
                    class="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-primary focus-visible:outline-none">
              <ui-icon [name]="showPw() ? 'visibility_off' : 'visibility'" class="text-xl" />
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="fa-confirm" class="text-sm font-bold text-gray-800">Confirm Password</label>
          <div class="relative">
            <input uiInput id="fa-confirm" [type]="showConfirm() ? 'text' : 'password'"
                   formControlName="confirmPassword" autocomplete="new-password" class="pr-10" />
            <button type="button" (click)="showConfirm.set(!showConfirm())"
                    class="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-primary focus-visible:outline-none">
              <ui-icon [name]="showConfirm() ? 'visibility_off' : 'visibility'" class="text-xl" />
            </button>
          </div>
        </div>

      </div>
    </div>

    <div class="mx-5 mt-auto flex flex-col-reverse gap-3 border-t border-primary/30 py-3 sm:mx-7 sm:flex-row sm:justify-end">
      <a uiButton variant="secondary" routerLink="/facilities/users">CANCEL</a>
      <button uiButton type="submit" [disabled]="saving()">SAVE</button>
    </div>
  </form>
`,
})
export class FacilitiesAddUser {
  private readonly fb     = inject(FormBuilder);
  private readonly api    = inject(FacilitiesUsersService);
  private readonly router = inject(Router);

  protected readonly saving      = signal(false);
  protected readonly error       = signal<string | null>(null);
  protected readonly showPw      = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      fullname:        ['', [Validators.required]],
      employeeId:      ['', [Validators.required]],
      email:           ['', [Validators.required, Validators.email]],
      username:        ['', [Validators.required]],
      password:        ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        this.form.errors?.['mismatch'] ? 'Passwords do not match' : 'Please complete all required fields',
      );
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.create({
      username:     v.username,
      fullname:     v.fullname,
      role:         'FACILITIESADMIN',
      email:        v.email,
      employeeId:   v.employeeId,
      passwordHash: v.password,
      status:       'ACTIVE',
    }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res?.success) this.router.navigateByUrl('/facilities/users');
        else this.error.set(res?.message ?? 'Failed to create account');
      },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message ?? 'Server error'); },
    });
  }
}
