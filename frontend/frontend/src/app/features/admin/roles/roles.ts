import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SERVICE_OPTIONS, type ServiceCode } from '../../../core/auth/roles';
import { UiButton, UiIcon, UiInput, UiToast } from '../../../shared/ui';
import { AppRoleRow } from './roles.models';
import { RolesService } from './roles.service';

@Component({
  selector: 'app-roles',
  imports: [ReactiveFormsModule, UiButton, UiIcon, UiInput, UiToast],
  templateUrl: './roles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPage {
  private readonly api = inject(RolesService);
  private readonly fb = inject(FormBuilder);

  protected readonly serviceOptions = SERVICE_OPTIONS;
  protected readonly roles = signal<AppRoleRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingCode = signal<string | null>(null);
  protected readonly showCreate = signal(false);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly toastSuccess = signal(false);

  protected readonly createForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z][A-Za-z0-9_]{1,48}$/)]],
    label: ['', [Validators.required]],
  });

  protected readonly createServices = signal<Set<ServiceCode>>(new Set());
  protected readonly editLabel = signal('');
  protected readonly editServices = signal<Set<ServiceCode>>(new Set());

  protected readonly editingRole = computed(() => {
    const code = this.editingCode();
    return this.roles().find((r) => r.code === code) ?? null;
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
          this.roles.set(res.roles ?? []);
        } else {
          this.error.set(res?.message ?? 'Failed to load roles');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected openCreate(): void {
    this.showCreate.set(true);
    this.createForm.reset({ code: '', label: '' });
    this.createServices.set(new Set());
  }

  protected cancelCreate(): void {
    this.showCreate.set(false);
  }

  protected toggleCreateService(code: ServiceCode): void {
    this.createServices.update((set) => {
      const next = new Set(set);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  protected createRole(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const services = [...this.createServices()];
    if (services.length === 0) {
      this.flash('Assign at least one service', false);
      return;
    }
    const v = this.createForm.getRawValue();
    this.saving.set(true);
    this.api
      .create({
        code: v.code.trim().toUpperCase(),
        label: v.label.trim(),
        services,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res?.success) {
            this.roles.set(res.roles ?? []);
            this.showCreate.set(false);
            this.flash(res.message || 'Role created', true);
          } else {
            this.flash(res?.message ?? 'Failed to create role', false);
          }
        },
        error: (err) => {
          this.saving.set(false);
          this.flash(err?.error?.message ?? 'Unable to reach the server', false);
        },
      });
  }

  protected startEdit(role: AppRoleRow): void {
    this.editingCode.set(role.code);
    this.editLabel.set(role.label);
    this.editServices.set(new Set(role.services as ServiceCode[]));
  }

  protected cancelEdit(): void {
    this.editingCode.set(null);
  }

  protected toggleEditService(code: ServiceCode): void {
    const role = this.editingRole();
    if (!role || this.servicesLocked(role)) return;
    this.editServices.update((set) => {
      const next = new Set(set);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  protected servicesLocked(role: AppRoleRow): boolean {
    return role.code === 'SUPERADMIN' || role.code === 'FLTTECH';
  }

  protected saveEdit(): void {
    const role = this.editingRole();
    if (!role) return;
    const label = this.editLabel().trim();
    if (!label) {
      this.flash('Label is required', false);
      return;
    }
    let services = [...this.editServices()];
    if (this.servicesLocked(role)) {
      services = role.services as ServiceCode[];
    } else if (
      services.length === 0 &&
      role.code !== 'EOADMIN'
    ) {
      this.flash('Assign at least one service', false);
      return;
    }
    this.saving.set(true);
    this.api.update(role.code, { label, services }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res?.success) {
          this.roles.set(res.roles ?? []);
          this.editingCode.set(null);
          this.flash(res.message || 'Role updated', true);
        } else {
          this.flash(res?.message ?? 'Failed to update role', false);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.flash(err?.error?.message ?? 'Unable to reach the server', false);
      },
    });
  }

  protected deleteRole(role: AppRoleRow): void {
    if (role.system || role.code === 'SUPERADMIN' || role.code === 'FLTTECH') {
      this.flash('Cannot delete system role', false);
      return;
    }
    if (role.userCount > 0) {
      this.flash(`Cannot delete: ${role.userCount} user(s) still assigned`, false);
      return;
    }
    if (!confirm(`Delete role ${role.code}?`)) return;
    this.saving.set(true);
    this.api.remove(role.code).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res?.success) {
          this.roles.set(res.roles ?? []);
          if (this.editingCode() === role.code) this.editingCode.set(null);
          this.flash(res.message || 'Role deleted', true);
        } else {
          this.flash(res?.message ?? 'Failed to delete role', false);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.flash(err?.error?.message ?? 'Unable to reach the server', false);
      },
    });
  }

  protected serviceChecked(set: Set<ServiceCode>, code: ServiceCode): boolean {
    return set.has(code);
  }

  protected formatServices(services: string[]): string {
    if (!services?.length) return 'None';
    return services
      .map((s) => SERVICE_OPTIONS.find((o) => o.code === s)?.label ?? s)
      .join(', ');
  }

  private flash(message: string, success: boolean): void {
    this.toastMessage.set(message);
    this.toastSuccess.set(success);
    this.showToast.set(true);
    window.setTimeout(() => this.showToast.set(false), 3200);
  }
}
