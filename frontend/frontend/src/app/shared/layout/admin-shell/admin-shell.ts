import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SideNav } from '../side-nav/side-nav';

/** Admin page chrome: side nav + scrollable main. Projects page content into main. */
@Component({
  selector: 'app-admin-shell',
  imports: [SideNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-transparent text-black lg:flex-row"
    >
      <app-side-nav />
      <main
        class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:pt-6"
        style="scrollbar-width: thin"
      >
        <ng-content />
      </main>
    </div>
  `,
})
export class AdminShell {}
