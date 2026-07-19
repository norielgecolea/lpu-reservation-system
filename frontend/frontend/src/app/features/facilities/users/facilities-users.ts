import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ResetPasswordModal } from '../../../shared/layout/reset-password-modal';
import { UiButton, UiIcon, UiInputSearch, UiStatusBadge, UiToast } from '../../../shared/ui';
import { UserRow } from '../../admin/users/users.models';
import { FacilitiesUsersService } from './facilities-users.service';

@Component({
  selector: 'app-facilities-users',
  imports: [RouterLink, ResetPasswordModal, UiButton, UiIcon, UiInputSearch, UiStatusBadge, UiToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
    <ui-input-search class="flex-1" [value]="search()" (valueChange)="search.set($event)" />
    <a uiButton routerLink="/facilities/users/new" class="w-full sm:w-auto">
      <ui-icon name="add" [size]="20" />
      <span>Add User</span>
    </a>
  </section>

  <section class="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white/45 backdrop-blur-xl ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)]">
    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full min-w-[52rem] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="bg-primary text-xs font-bold uppercase tracking-wide text-white">
            <th class="px-5 py-4">Employee ID</th>
            <th class="px-4 py-3">Username</th>
            <th class="px-4 py-3">Full Name</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            @for (r of [1,2,3,4,5]; track r) {
              <tr class="border-b border-gray-100">
                <td class="px-5 py-4"><div class="h-4 w-24 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="h-4 w-28 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="h-4 w-40 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="h-4 w-48 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="mx-auto h-6 w-20 animate-pulse rounded-full bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="flex justify-center gap-2">
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                </div></td>
              </tr>
            }
          } @else if (error()) {
            <tr><td colspan="6" class="px-4 py-8 text-center text-red-600">{{ error() }}</td></tr>
          } @else if (filtered().length === 0) {
            <tr><td colspan="6" class="px-4 py-10 text-center text-gray-500">
              No facilities admin accounts found.
            </td></tr>
          } @else {
            @for (u of filtered(); track u.employeeId) {
              <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50/70 hover:bg-secondary/5">
                <td class="px-5 py-4 text-black">{{ u.employeeId }}</td>
                <td class="px-4 py-3 text-black">{{ u.username }}</td>
                <td class="px-4 py-3 font-medium text-black">{{ u.fullname }}</td>
                <td class="px-4 py-3 text-black">{{ u.email }}</td>
                <td class="px-4 py-3 text-center"><ui-status-badge [status]="u.status" /></td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2 text-gray-500">
                    <a title="Edit" [routerLink]="['/facilities/users', u.employeeId, 'edit']"
                       class="cursor-pointer rounded-lg p-1.5 hover:text-primary">
                      <ui-icon name="edit_square" class="text-xl" />
                    </a>
                    @if (!isSelf(u)) {
                      <button type="button" (click)="toggleStatus(u)"
                              class="cursor-pointer rounded-lg p-1.5 hover:text-primary"
                              [title]="isActive(u.status) ? 'Deactivate' : 'Activate'">
                        <ui-icon [name]="isActive(u.status) ? 'pause_circle' : 'play_circle'" class="text-xl" />
                      </button>
                      <button type="button" title="Reset password" (click)="openResetPassword(u)"
                              class="cursor-pointer rounded-lg p-1.5 hover:text-primary">
                        <ui-icon name="lock_reset" class="text-xl" />
                      </button>
                      <button type="button" title="Delete" (click)="remove(u)"
                              class="cursor-pointer rounded-lg p-1.5 hover:text-red-600">
                        <ui-icon name="delete" class="text-xl" />
                      </button>
                    } @else {
                      <span class="px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">You</span>
                    }
                  </div>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  </section>

  <ui-toast class="contents" [show]="showToast()" [success]="toastSuccess()" [message]="toastMsg()" />

  @if (resetTarget(); as target) {
    <app-reset-password-modal
      [employeeId]="target.employeeId"
      [username]="target.username"
      (closed)="closeResetPassword()"
      (confirmed)="confirmResetPassword($event)"
    />
  }
`,
})
export class FacilitiesUsers {
  private readonly api = inject(FacilitiesUsersService);
  private readonly auth = inject(AuthService);

  protected readonly users = signal<UserRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly resetTarget = signal<UserRow | null>(null);

  protected readonly showToast = signal(false);
  protected readonly toastSuccess = signal(false);
  protected readonly toastMsg = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rows = this.users();
    if (!q) return rows;
    return rows.filter(u =>
      [u.username, u.fullname, u.email, u.status, u.employeeId].some(f => f?.toLowerCase().includes(q)),
    );
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
        if (res?.success) this.users.set(res.users ?? []);
        else this.error.set(res?.message ?? 'Failed to load users');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected isSelf(u: UserRow): boolean {
    const empId = this.auth.user()?.empId;
    return !!empId && u.employeeId === empId;
  }

  protected isActive(status: string): boolean {
    return status?.toUpperCase() === 'ACTIVE';
  }

  protected openResetPassword(u: UserRow): void {
    this.resetTarget.set(u);
  }

  protected closeResetPassword(): void {
    this.resetTarget.set(null);
  }

  protected confirmResetPassword(newPassword: string): void {
    const target = this.resetTarget();
    if (!target) return;

    this.api.resetPassword({ employeeId: target.employeeId, newPassword }).subscribe({
      next: (res) => {
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) this.closeResetPassword();
      },
      error: (err) => this.toast(false, err?.error?.message ?? 'Unable to reach the server'),
    });
  }

  protected toggleStatus(u: UserRow): void {
    if (this.isSelf(u)) return;
    const action = this.isActive(u.status) ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${u.username}"?`)) return;

    this.api.toggleStatus(u.employeeId).subscribe({
      next: (res) => {
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.users.update(rows =>
            rows.map(r =>
              r.employeeId === u.employeeId
                ? { ...r, status: this.isActive(r.status) ? 'INACTIVE' : 'ACTIVE' }
                : r,
            ),
          );
        }
      },
      error: (err) => this.toast(false, err?.error?.message ?? 'Unable to reach the server'),
    });
  }

  protected remove(u: UserRow): void {
    if (this.isSelf(u)) return;
    if (!confirm(`Delete account "${u.username}"? This cannot be undone.`)) return;

    this.api.remove(u.employeeId).subscribe({
      next: (res) => {
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) this.users.update(rows => rows.filter(r => r.employeeId !== u.employeeId));
      },
      error: (err) => this.toast(false, err?.error?.message ?? 'Unable to reach the server'),
    });
  }

  private toast(success: boolean, message: string): void {
    this.toastSuccess.set(success);
    this.toastMsg.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }
}
