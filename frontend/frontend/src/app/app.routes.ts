import { Routes } from '@angular/router';

import {
  authGuard,
  facilitiesGuard,
  fltTechGuard,
  serviceGuard,
  superAdminGuard,
} from './core/auth/auth.guard';

const adminLayout = () =>
  import('./shared/layout/admin-layout/admin-layout').then((m) => m.AdminLayout);

const superAdminRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'users',
    loadComponent: () => import('./features/admin/users/users').then((m) => m.Users),
  },
  {
    path: 'users/new',
    loadComponent: () => import('./features/admin/users/add-user').then((m) => m.AddUser),
  },
  {
    path: 'users/:employeeId/edit',
    loadComponent: () => import('./features/admin/users/edit-user').then((m) => m.EditUser),
  },
  {
    path: 'roles',
    loadComponent: () => import('./features/admin/roles/roles').then((m) => m.RolesPage),
  },
  {
    path: 'allowed-emails',
    loadComponent: () =>
      import('./features/admin/allowed-emails/allowed-emails').then((m) => m.AllowedEmails),
  },
  {
    path: 'equipments',
    loadComponent: () =>
      import('./features/admin/equipments/equipments').then((m) => m.Equipments),
  },
  {
    path: 'equipments/new',
    loadComponent: () =>
      import('./features/admin/equipments/add-equipment').then((m) => m.AddEquipment),
  },
  {
    path: 'equipments/:id/edit',
    loadComponent: () =>
      import('./features/admin/equipments/edit-equipment').then((m) => m.EditEquipment),
  },
  {
    path: 'vehicles',
    loadComponent: () => import('./features/admin/vehicles/vehicles').then((m) => m.Vehicles),
  },
  {
    path: 'vehicles/new',
    loadComponent: () => import('./features/admin/vehicles/add-vehicle').then((m) => m.AddVehicle),
  },
  {
    path: 'vehicles/:id/edit',
    loadComponent: () =>
      import('./features/admin/vehicles/edit-vehicle').then((m) => m.EditVehicle),
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./features/facilities/drivers/facilities-drivers').then((m) => m.FacilitiesDrivers),
  },
  {
    path: 'reservation/flt/new',
    canActivate: [serviceGuard('FLT')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'flt' },
  },
  {
    path: 'reservation/flt',
    canActivate: [serviceGuard('FLT')],
    loadComponent: () =>
      import('./features/admin/reservations/flt/flt-reservations').then((m) => m.FltReservations),
  },
  {
    path: 'reservation/gymnasium/new',
    canActivate: [serviceGuard('GYMNASIUM')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'gymnasium' },
  },
  {
    path: 'reservation/gymnasium',
    canActivate: [serviceGuard('GYMNASIUM')],
    loadComponent: () =>
      import('./features/admin/reservations/gymnasium/gymnasium-reservations').then(
        (m) => m.GymnasiumReservations,
      ),
  },
  {
    path: 'reservation/van/new',
    canActivate: [serviceGuard('VAN')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'van' },
  },
  {
    path: 'reservation/van',
    canActivate: [serviceGuard('VAN')],
    loadComponent: () =>
      import('./features/admin/reservations/van/van-reservations').then((m) => m.VanReservations),
  },
  {
    path: 'audit/flt',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'FLT' },
  },
  {
    path: 'audit/gymnasium',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'GYMNASIUM' },
  },
  {
    path: 'audit/van',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'VAN' },
  },
  {
    path: 'audit/maintenance',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'MAINTENANCE' },
  },
  {
    path: 'audit/users',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'USERS' },
  },
  {
    path: 'audit/equipments',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'EQUIPMENTS' },
  },
  {
    path: 'audit/vehicles',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'VEHICLES' },
  },
  {
    path: 'audit/drivers',
    canActivate: [superAdminGuard],
    loadComponent: () =>
      import('./features/admin/audit/audit-logs').then((m) => m.AuditLogs),
    data: { service: 'DRIVERS' },
  },
];

const facilitiesRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/facilities/dashboard/facilities-dashboard').then(
        (m) => m.FacilitiesDashboard,
      ),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./features/facilities/users/facilities-users').then((m) => m.FacilitiesUsers),
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./features/facilities/users/facilities-add-user').then((m) => m.FacilitiesAddUser),
  },
  {
    path: 'users/:id/edit',
    loadComponent: () =>
      import('./features/facilities/users/facilities-edit-user').then((m) => m.FacilitiesEditUser),
  },
  {
    path: 'equipments',
    loadComponent: () =>
      import('./features/admin/equipments/equipments').then((m) => m.Equipments),
  },
  {
    path: 'equipments/new',
    loadComponent: () =>
      import('./features/admin/equipments/add-equipment').then((m) => m.AddEquipment),
  },
  {
    path: 'equipments/:id/edit',
    loadComponent: () =>
      import('./features/admin/equipments/edit-equipment').then((m) => m.EditEquipment),
  },
  {
    path: 'vehicles',
    loadComponent: () => import('./features/admin/vehicles/vehicles').then((m) => m.Vehicles),
  },
  {
    path: 'vehicles/new',
    loadComponent: () => import('./features/admin/vehicles/add-vehicle').then((m) => m.AddVehicle),
  },
  {
    path: 'vehicles/:id/edit',
    loadComponent: () =>
      import('./features/admin/vehicles/edit-vehicle').then((m) => m.EditVehicle),
  },
  {
    path: 'reservation/flt/new',
    canActivate: [serviceGuard('FLT')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'flt' },
  },
  {
    path: 'reservation/flt',
    canActivate: [serviceGuard('FLT')],
    loadComponent: () =>
      import('./features/admin/reservations/flt/flt-reservations').then((m) => m.FltReservations),
  },
  {
    path: 'reservation/gymnasium/new',
    canActivate: [serviceGuard('GYMNASIUM')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'gymnasium' },
  },
  {
    path: 'reservation/gymnasium',
    canActivate: [serviceGuard('GYMNASIUM')],
    loadComponent: () =>
      import('./features/admin/reservations/gymnasium/gymnasium-reservations').then(
        (m) => m.GymnasiumReservations,
      ),
  },
  {
    path: 'reservation/van/new',
    canActivate: [serviceGuard('VAN')],
    loadComponent: () =>
      import('./features/admin/reservations/admin-add-reservation').then(
        (m) => m.AdminAddReservation,
      ),
    data: { service: 'van' },
  },
  {
    path: 'reservation/van',
    canActivate: [serviceGuard('VAN')],
    loadComponent: () =>
      import('./features/admin/reservations/van/van-reservations').then((m) => m.VanReservations),
  },
  {
    path: 'drivers',
    loadComponent: () =>
      import('./features/facilities/drivers/facilities-drivers').then((m) => m.FacilitiesDrivers),
  },
];

const fltTechRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/admin/dashboard/dashboard').then((m) => m.Dashboard),
    data: { fltTechContext: true },
  },
  {
    path: 'reservation/flt',
    canActivate: [serviceGuard('FLT')],
    loadComponent: () =>
      import('./features/admin/reservations/flt/flt-reservations').then((m) => m.FltReservations),
    data: { fltTechContext: true },
  },
];

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'customer',
  },
  {
    path: 'facilities',
    canActivate: [facilitiesGuard],
    loadComponent: adminLayout,
    children: facilitiesRoutes,
  },
  {
    path: 'flt-tech',
    canActivate: [fltTechGuard],
    loadComponent: adminLayout,
    children: fltTechRoutes,
  },
  {
    path: 'customer',
    loadChildren: () =>
      import('./features/customer/customer.routes').then((m) => m.CUSTOMER_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: adminLayout,
    children: superAdminRoutes,
  },
  { path: '**', redirectTo: 'customer' },
];
