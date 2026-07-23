import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  UiButton,
  UiIcon,
  UiInput,
  UiInputSearch,
  UiStatusBadge,
  UiToast,
} from '../../../shared/ui';
import { LPU_LAGUNA_EMAIL_DOMAIN, isLpuLagunaEmail } from '../../../shared/constants/lpu-email';
import { AllowedEmailRow } from './allowed-emails.models';
import { AllowedEmailsService } from './allowed-emails.service';

@Component({
  selector: 'app-allowed-emails',
  imports: [
    ReactiveFormsModule,
    UiButton,
    UiIcon,
    UiInput,
    UiInputSearch,
    UiStatusBadge,
    UiToast,
  ],
  templateUrl: './allowed-emails.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowedEmails {
  private readonly api = inject(AllowedEmailsService);
  private static readonly PAGE_SIZE = 100;

  protected readonly domain = LPU_LAGUNA_EMAIL_DOMAIN;
  protected readonly emails = signal<AllowedEmailRow[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly importing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(0);
  protected readonly totalCount = signal(0);
  protected readonly showToast = signal(false);
  protected readonly toastMessage = signal('');
  protected readonly toastSuccess = signal(false);

  protected readonly emailControl = new FormControl('', [
    Validators.required,
    Validators.email,
    (control) => (isLpuLagunaEmail(control.value ?? '') ? null : { lpuDomain: true }),
  ]);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / AllowedEmails.PAGE_SIZE)),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .list({
        page: this.page(),
        size: AllowedEmails.PAGE_SIZE,
        search: this.search() || undefined,
      })
      .subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res?.success) {
          this.emails.set(res.emails ?? []);
          this.totalCount.set(res.totalCount ?? 0);
        } else {
          this.error.set(res?.message ?? 'Failed to load allowed emails');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.load();
  }

  protected prevPage(): void {
    if (this.page() > 0) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  protected nextPage(): void {
    if (this.page() < this.totalPages() - 1) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  protected addEmail(): void {
    this.emailControl.markAsTouched();
    if (this.emailControl.invalid) {
      return;
    }

    const email = this.emailControl.value!.trim().toLowerCase();
    this.saving.set(true);
    this.api.create({ email }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.emailControl.reset('');
          this.load();
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected triggerCsvImport(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  protected onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const csvText = typeof reader.result === 'string' ? reader.result : '';
      const emails = this.extractEmailsFromCsv(csvText);

      if (emails.length === 0) {
        this.showResponse(false, 'No valid emails found in column "User principal name" (column C).');
        input.value = '';
        return;
      }

      const confirmed = confirm(
        `Import ${emails.length} email(s) and replace all existing records? This will delete old records.`,
      );
      if (!confirmed) {
        input.value = '';
        return;
      }

      this.importing.set(true);
      this.api.importAndReplace({ emails }).subscribe({
        next: (res) => {
          this.importing.set(false);
          this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');
          if (res?.success) {
            this.load();
          }
          input.value = '';
        },
        error: (err) => {
          this.importing.set(false);
          this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
          input.value = '';
        },
      });
    };
    reader.onerror = () => {
      this.showResponse(false, 'Failed to read CSV file.');
      input.value = '';
    };
    reader.readAsText(file);
  }

  protected toggleStatus(row: AllowedEmailRow): void {
    const action = this.isActive(row.status) ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${row.email}"?`)) {
      return;
    }

    this.api.toggleStatus(row.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.emails.update((rows) =>
            rows.map((item) =>
              item.id === row.id
                ? { ...item, status: this.isActive(item.status) ? 'INACTIVE' : 'ACTIVE' }
                : item,
            ),
          );
        }
      },
      error: (err) => {
        this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected remove(row: AllowedEmailRow): void {
    if (!confirm(`Remove "${row.email}" from the allowed list?`)) {
      return;
    }

    this.api.remove(row.id).subscribe({
      next: (res) => {
        this.showResponse(res?.success ?? false, res?.message ?? 'Unknown response');
        if (res?.success) {
          this.emails.update((rows) => rows.filter((item) => item.id !== row.id));
        }
      },
      error: (err) => {
        this.showResponse(false, err?.error?.message ?? 'Unable to reach the server');
      },
    });
  }

  protected isActive(status: string): boolean {
    return status?.toUpperCase() === 'ACTIVE';
  }

  protected showResponse(success: boolean, message: string): void {
    this.toastSuccess.set(success);
    this.toastMessage.set(message);
    this.showToast.set(true);
  }

  private extractEmailsFromCsv(csvText: string): string[] {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return [];
    }

    const rows = lines.map((line) => this.parseCsvLine(line));
    const header = rows[0].map((value) => value.trim().toLowerCase());
    const targetIndexByHeader = header.findIndex((value) => value === 'user principal name');
    const targetColumnIndex = targetIndexByHeader >= 0 ? targetIndexByHeader : 2;

    const uniqueEmails = new Set<string>();
    for (let i = 1; i < rows.length; i += 1) {
      const value = (rows[i][targetColumnIndex] ?? '').trim().toLowerCase();
      if (isLpuLagunaEmail(value)) {
        uniqueEmails.add(value);
      }
    }

    return [...uniqueEmails];
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        const nextChar = line[i + 1];
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
        continue;
      }

      if (char === ',' && !insideQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  }
}
