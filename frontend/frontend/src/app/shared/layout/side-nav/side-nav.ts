import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
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

  protected readonly user  = this.auth.user;

  private static readonly SUPERADMIN_NAV: NavItem[] = [
    { label: 'Dashboard',   icon: 'grid_view',       link: '/dashboard' },
    { label: 'Users',       icon: 'group',           link: '/users' },
    { label: 'Equipments',  icon: 'inventory_2',     link: '/equipments' },
    { label: 'Vehicles',    icon: 'directions_car',  link: '/vehicles' },
    { label: 'Drivers',     icon: 'badge',           link: '/drivers' },
    {
      label: 'Reservation', icon: 'event_note', children: [
        { label: 'FLT Theater', icon: 'theaters',          link: '/reservation/flt' },
        { label: 'Gymnasium',   icon: 'sports_gymnastics', link: '/reservation/gymnasium' },
        { label: 'University Van', icon: 'airport_shuttle', link: '/reservation/van' },
      ],
    },
    {
      label: 'Audit', icon: 'history', children: [
        { label: 'FLT Theater',      icon: 'theaters',          link: '/audit/flt' },
        { label: 'Gymnasium',        icon: 'sports_gymnastics', link: '/audit/gymnasium' },
        { label: 'University Van',   icon: 'airport_shuttle',   link: '/audit/van' },
        { label: 'Maintenance',      icon: 'construction',      link: '/audit/maintenance' },
        { label: 'Users',            icon: 'group',             link: '/audit/users' },
        { label: 'Equipments',       icon: 'inventory_2',       link: '/audit/equipments' },
        { label: 'Vehicles',         icon: 'directions_car',    link: '/audit/vehicles' },
        { label: 'Drivers',          icon: 'badge',             link: '/audit/drivers' },
      ],
    },
  ];

  private static readonly FACILITIES_NAV: NavItem[] = [
    { label: 'Dashboard',  icon: 'grid_view',    link: '/facilities/dashboard' },
    { label: 'Users',      icon: 'group',        link: '/facilities/users' },
    { label: 'Equipments', icon: 'inventory_2',  link: '/facilities/equipments' },
    { label: 'Vehicles',   icon: 'directions_car', link: '/facilities/vehicles' },
    { label: 'Drivers',    icon: 'badge',        link: '/facilities/drivers' },
    {
      label: 'Scheduling', icon: 'event_note', children: [
        { label: 'FLT Theater',    icon: 'theaters',          link: '/facilities/reservation/flt' },
        { label: 'Gymnasium',      icon: 'sports_gymnastics', link: '/facilities/reservation/gymnasium' },
        { label: 'University Van', icon: 'airport_shuttle',   link: '/facilities/reservation/van' },
      ],
    },
  ];

  protected readonly nav = computed<NavItem[]>(() => {
    const role = this.user()?.role;
    if (role === 'FACILITIESADMIN') {
      return SideNav.FACILITIES_NAV;
    }
    if (role === 'SUPERADMIN') {
      return SideNav.SUPERADMIN_NAV;
    }
    return SideNav.SUPERADMIN_NAV;
  });

  protected readonly openGroups = signal<Set<string>>(new Set());
  protected readonly profileOpen = signal(false);
  protected readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    this.syncOpenGroups();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.syncOpenGroups();
        this.mobileNavOpen.set(false);
      });
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update(open => !open);
  }

  private syncOpenGroups(): void {
    this.openGroups.update(set => {
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
    this.openGroups.update(set => {
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
    return children.some(c =>
      this.router.isActive(c.link, {
        paths: 'subset',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      })
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
