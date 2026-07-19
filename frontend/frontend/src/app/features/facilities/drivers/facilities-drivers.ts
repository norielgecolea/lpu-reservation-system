import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButton, UiIcon, UiInputSearch, UiStatusBadge, UiToast } from '../../../shared/ui';
import { CreateDriverRequest, DriverRow, DriversService, UpdateDriverRequest } from './drivers.service';

@Component({
  selector: 'app-facilities-drivers',
  imports: [ UiButton, UiIcon, UiInputSearch, UiStatusBadge, UiToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<section class="animate-rise flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-xl font-black text-gray-900">Drivers</h1>
      <p class="text-sm text-gray-500 mt-0.5">Manage university van drivers</p>
    </div>
    <button uiButton type="button" (click)="openCreate()" class="w-full sm:w-auto">
      <ui-icon name="add" [size]="20" />
      <span>ADD DRIVER</span>
    </button>
  </section>

  <section class="animate-rise flex shrink-0">
    <ui-input-search class="flex-1" [value]="search()" (valueChange)="search.set($event)" placeholder="Search by name or contact..." />
  </section>

  <section class="animate-rise flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white/45 backdrop-blur-xl ring-1 ring-inset ring-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_16px_40px_-12px_rgba(24,24,27,0.18)]">
    <div class="min-h-0 flex-1 overflow-auto">
      <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead class="sticky top-0 z-10">
          <tr class="bg-primary text-xs font-bold uppercase tracking-wide text-white">
            <th class="px-5 py-4">ID</th>
            <th class="px-4 py-3">Full Name</th>
            <th class="px-4 py-3">Contact Number</th>
            <th class="px-4 py-3 text-center">Status</th>
            <th class="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            @for (r of [1,2,3,4,5]; track r) {
              <tr class="border-b border-gray-100">
                <td class="px-5 py-4"><div class="h-4 w-8 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="h-4 w-40 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="h-4 w-32 animate-pulse rounded bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="mx-auto h-6 w-20 animate-pulse rounded-full bg-gray-200"></div></td>
                <td class="px-4 py-3"><div class="flex justify-center gap-2">
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                  <div class="h-8 w-8 animate-pulse rounded-lg bg-gray-200"></div>
                </div></td>
              </tr>
            }
          } @else if (error()) {
            <tr><td colspan="5" class="px-4 py-8 text-center text-red-600">{{ error() }}</td></tr>
          } @else if (filtered().length === 0) {
            <tr><td colspan="5" class="px-4 py-10 text-center text-gray-500">
              No drivers found.
            </td></tr>
          } @else {
            @for (d of filtered(); track d.id) {
              <tr class="border-b border-gray-100 odd:bg-white even:bg-gray-50/70 hover:bg-secondary/5">
                <td class="px-5 py-4 text-black font-mono text-xs">{{ d.id }}</td>
                <td class="px-4 py-3 font-medium text-black">{{ d.fullName }}</td>
                <td class="px-4 py-3 text-black">{{ d.contactNumber }}</td>
                <td class="px-4 py-3 text-center"><ui-status-badge [status]="d.status" /></td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2 text-gray-500">
                    <button type="button" title="Edit" (click)="openEdit(d)"
                            class="cursor-pointer rounded-lg p-1.5 hover:text-primary">
                      <ui-icon name="edit_square" class="text-xl" />
                    </button>
                    <button type="button" (click)="toggleStatus(d)"
                            class="cursor-pointer rounded-lg p-1.5 hover:text-primary"
                            [title]="isActive(d.status) ? 'Deactivate' : 'Activate'">
                      <ui-icon [name]="isActive(d.status) ? 'pause_circle' : 'play_circle'" class="text-xl" />
                    </button>
                    <button type="button" title="Delete" (click)="remove(d)"
                            class="cursor-pointer rounded-lg p-1.5 hover:text-red-600">
                      <ui-icon name="delete" class="text-xl" />
                    </button>
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

  @if (formOpen()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" (click)="closeForm()">
      <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4" (click)="$event.stopPropagation()">
        <h2 class="text-lg font-black text-gray-900">
          {{ editTarget() ? 'Edit Driver' : 'Add Driver' }}
        </h2>
        <div class="flex flex-col gap-3">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold text-gray-700">Full Name</span>
            <input type="text" [value]="formName()" (input)="formName.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-semibold text-gray-700">Contact Number</span>
            <input type="text" [value]="formContact()" (input)="formContact.set($any($event.target).value)"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </label>
        </div>
        <div class="flex gap-2 justify-end">
          <button type="button" (click)="closeForm()"
            class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
          <button type="button" (click)="saveForm()" [disabled]="saving()"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50">
            @if (saving()) { Saving... } @else { Save }
          </button>
        </div>
      </div>
    </div>
  }
`,
})
export class FacilitiesDrivers {
  private readonly api = inject(DriversService);

  protected readonly drivers = signal<DriverRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly formOpen = signal(false);
  protected readonly editTarget = signal<DriverRow | null>(null);
  protected readonly formName = signal('');
  protected readonly formContact = signal('');
  protected readonly saving = signal(false);

  protected readonly showToast = signal(false);
  protected readonly toastSuccess = signal(false);
  protected readonly toastMsg = signal('');

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return q
      ? this.drivers().filter(d => [d.fullName, d.contactNumber, d.status].some(f => f?.toLowerCase().includes(q)))
      : this.drivers();
  });

  constructor() { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) this.drivers.set(res.drivers ?? []);
        else this.error.set(res?.message ?? 'Failed to load drivers');
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.message ?? 'Server error'); },
    });
  }

  protected isActive(status: string): boolean { return status?.toUpperCase() === 'ACTIVE'; }

  protected openCreate(): void {
    this.editTarget.set(null);
    this.formName.set('');
    this.formContact.set('');
    this.formOpen.set(true);
  }

  protected openEdit(d: DriverRow): void {
    this.editTarget.set(d);
    this.formName.set(d.fullName);
    this.formContact.set(d.contactNumber);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editTarget.set(null);
  }

  protected saveForm(): void {
    const name = this.formName().trim();
    const contact = this.formContact().trim();
    if (!name || !contact) {
      this.toast(false, 'Full name and contact number are required.');
      return;
    }

    this.saving.set(true);
    const target = this.editTarget();
    const req$ = target
      ? this.api.update({ id: target.id, fullName: name, contactNumber: contact } satisfies UpdateDriverRequest)
      : this.api.create({ fullName: name, contactNumber: contact, status: 'ACTIVE' } satisfies CreateDriverRequest);

    req$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.closeForm();
          this.load();
        }
      },
      error: (err) => { this.saving.set(false); this.toast(false, err?.error?.message ?? 'Server error'); },
    });
  }

  protected toggleStatus(d: DriverRow): void {
    const action = this.isActive(d.status) ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${d.fullName}"?`)) return;
    this.api.toggleStatus(d.id).subscribe({
      next: (res) => {
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.drivers.update(rows => rows.map(r =>
            r.id === d.id ? { ...r, status: this.isActive(r.status) ? 'INACTIVE' : 'ACTIVE' } : r
          ));
        }
      },
      error: (err) => this.toast(false, err?.error?.message ?? 'Server error'),
    });
  }

  protected remove(d: DriverRow): void {
    if (
      !confirm(
        `Are you sure you want to delete "${d.fullName}"?\n\nAny van reservations linked to this driver will have their driver assignment cleared. This action cannot be undone.`,
      )
    ) {
      return;
    }
    this.api.remove(d.id).subscribe({
      next: (res) => {
        this.toast(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) this.drivers.update(rows => rows.filter(r => r.id !== d.id));
      },
      error: (err) => this.toast(false, err?.error?.message ?? 'Server error'),
    });
  }

  private toast(success: boolean, message: string): void {
    this.toastSuccess.set(success);
    this.toastMsg.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }
}
