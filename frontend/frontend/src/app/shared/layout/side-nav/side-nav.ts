import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import {
  effectiveServices,
  isFltTech,
  isSuperAdmin,
  reservationLinkForService,
  serviceIcon,
  serviceLabel,
  usesFacilitiesShell,
} from '../../../core/auth/roles';
import { AccountProfileModal } from '../account-profile-modal';
import { UiIcon } from '../../ui';

interface NavChild {
  label: string;
  icon: string;
  link: string;
}

interface NavItem {
  label: string;
  icon: string;
  link?: string;
  children?: NavChild[];
}

@Component({
  selector: 'app-side-nav',
  imports: [RouterLink, RouterLinkActive, UiIcon, AccountProfileModal],
  templateUrl: './side-nav.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class SideNav implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;

  protected readonly nav = computed<NavItem[]>(() => {
    const user = this.user();
    const role = user?.role;
    if (isFltTech(role)) {
      return [
        { label: 'Dashboard', icon: 'grid_view', link: '/flt-tech/dashboard' },
        { label: 'FLT Theater', icon: 'theaters', link: '/flt-tech/reservation/flt' },
      ];
    }

    const services = effectiveServices(user);

    if (isSuperAdmin(role)) {
      const reservationChildren = services.map((s) => ({
        label: serviceLabel(s),
        icon: serviceIcon(s),
        link: reservationLinkForService(s, 'super'),
      }));
      return [
        { label: 'Dashboard', icon: 'grid_view', link: '/dashboard' },
        { label: 'Users', icon: 'group', link: '/users' },
        { label: 'Roles', icon: 'admin_panel_settings', link: '/roles' },
        { label: 'Allowed Emails', icon: 'mail', link: '/allowed-emails' },
        { label: 'Equipments', icon: 'inventory_2', link: '/equipments' },
        { label: 'Vehicles', icon: 'directions_car', link: '/vehicles' },
        ...(reservationChildren.length
          ? [{ label: 'Reservation', icon: 'event_note', children: reservationChildren }]
          : []),
        {
          label: 'Audit',
          icon: 'history',
          children: [
            { label: 'FLT Theater', icon: 'theaters', link: '/audit/flt' },
            { label: 'Gymnasium', icon: 'sports_basketball', link: '/audit/gymnasium' },
            { label: 'Nexus Room', icon: 'co_present', link: '/audit/nexus' },
            { label: 'University Van', icon: 'airport_shuttle', link: '/audit/van' },
            { label: 'Maintenance', icon: 'construction', link: '/audit/maintenance' },
            { label: 'Users', icon: 'group', link: '/audit/users' },
            { label: 'Equipments', icon: 'inventory_2', link: '/audit/equipments' },
            { label: 'Vehicles', icon: 'directions_car', link: '/audit/vehicles' },
          ],
        },
      ];
    }

    if (usesFacilitiesShell(user)) {
      const schedulingChildren = services.map((s) => ({
        label: serviceLabel(s),
        icon: serviceIcon(s),
        link: reservationLinkForService(s, 'facilities'),
      }));
      return [
        { label: 'Dashboard', icon: 'grid_view', link: '/facilities/dashboard' },
        { label: 'Users', icon: 'group', link: '/facilities/users' },
        { label: 'Equipments', icon: 'inventory_2', link: '/facilities/equipments' },
        { label: 'Vehicles', icon: 'directions_car', link: '/facilities/vehicles' },
        ...(schedulingChildren.length
          ? [{ label: 'Scheduling', icon: 'event_note', children: schedulingChildren }]
          : []),
      ];
    }

    return [{ label: 'Dashboard', icon: 'grid_view', link: '/dashboard' }];
  });

  protected readonly openGroups = signal<Set<string>>(new Set());
  protected readonly profileOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    this.syncOpenGroups();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.syncOpenGroups();
        this.mobileNavOpen.set(false);
      });
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  private syncOpenGroups(): void {
    this.openGroups.update((set) => {
      const next = new Set(set);
      for (const item of this.nav()) {
        if (item.children && this.isChildActive(item.children)) {
          next.add(item.label);
        }
      }
      return next;
    });
  }

  protected isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  protected toggleGroup(label: string): void {
    this.openGroups.update((set) => {
      const next = new Set(set);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  protected isChildActive(children: NavChild[]): boolean {
    return children.some((c) =>
      this.router.isActive(c.link, {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      }),
    );
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected openProfile(): void {
    this.profileOpen.set(true);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
  }
}
