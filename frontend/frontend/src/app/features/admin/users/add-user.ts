import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect } from '../../../shared/ui';
import { USER_ROLE_OPTIONS } from './user-roles';
import { UsersService } from './users.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-add-user',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect],
  templateUrl: './add-user.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddUser {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersService);
  private readonly router = inject(Router);

  protected readonly roles = USER_ROLE_OPTIONS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      fullname: ['', [Validators.required]],
      role: ['', [Validators.required]],
      employeeId: ['', [Validators.required]],
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      email: ['', [Validators.required, Validators.email]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set(
        this.form.errors?.['mismatch']
          ? 'Passwords do not match'
          : 'Please complete all required fields',
      );
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);

    this.api
      .create({
        username: v.username,
        fullname: v.fullname,
        role: v.role,
        email: v.email,
        employeeId: v.employeeId,
        passwordHash: v.password,
        status: 'ACTIVE',
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res?.success) {
            this.router.navigateByUrl('/users');
          } else {
            this.error.set(res?.message ?? 'Failed to create account');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }
}
