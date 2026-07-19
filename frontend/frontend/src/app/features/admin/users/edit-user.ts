import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect } from '../../../shared/ui';
import { USER_ROLE_OPTIONS } from './user-roles';
import { UsersService } from './users.service';

@Component({
  selector: 'app-edit-user',
  imports: [ReactiveFormsModule, RouterLink, UiButton, UiFormFeedback, UiIcon, UiInput, UiSelect],
  templateUrl: './edit-user.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUser {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly ready = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly oldEmployeeId = signal('');
  protected readonly currentRole = signal<string | null>(null);

  protected readonly roles = computed(() => {
    const current = this.currentRole();
    if (!current || USER_ROLE_OPTIONS.some((role) => role.value === current)) {
      return USER_ROLE_OPTIONS;
    }

    return [{ label: current, value: current }, ...USER_ROLE_OPTIONS];
  });

  protected readonly form = this.fb.nonNullable.group({
    fullname: ['', [Validators.required]],
    employeeId: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    role: ['', [Validators.required]],
  });

  constructor() {
    const employeeId = this.route.snapshot.paramMap.get('employeeId') ?? '';
    this.oldEmployeeId.set(employeeId);

    if (!employeeId) {
      this.loading.set(false);
      this.error.set('Missing employee ID');
      return;
    }

    this.load(employeeId);
  }

  private load(employeeId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
      next: (res) => {
        this.loading.set(false);

        if (!res?.success) {
          this.error.set(res?.message ?? 'Failed to load user');
          return;
        }

        const user = (res.users ?? []).find(
          (row) => row.employeeId.toLowerCase() === employeeId.toLowerCase(),
        );

        if (!user) {
          this.error.set('User not found');
          return;
        }

        this.currentRole.set(user.role);
        this.form.setValue({
          fullname: user.fullname,
          employeeId: user.employeeId,
          email: user.email,
          username: user.username,
          role: user.role,
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
      this.error.set('User details are not ready yet');
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
        oldEmployeeId: this.oldEmployeeId(),
        employeeId: v.employeeId,
        fullname: v.fullname,
        username: v.username,
        email: v.email,
        role: v.role,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res?.success) {
            this.router.navigateByUrl('/users');
          } else {
            this.error.set(res?.message ?? 'Failed to update account');
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message ?? 'Unable to reach the server');
        },
      });
  }
}
