export type AuditServiceCode =
  | 'FLT'
  | 'GYMNASIUM'
  | 'NEXUS'
  | 'VAN'
  | 'MAINTENANCE'
  | 'USERS'
  | 'EQUIPMENTS'
  | 'VEHICLES'
  | 'DRIVERS';

export interface AuditLogRow {
  id: number;
  service: string;
  actionType: string;
  adminUsername: string;
  adminFullname: string | null;
  targetType: string | null;
  targetId: number | null;
  targetLabel: string | null;
  details: string | null;
  performedAt: string;
}

export interface AuditLogResponse {
  success: boolean;
  message: string;
  logs?: AuditLogRow[];
  totalCount?: number;
  actionTypes?: string[];
}

export const AUDIT_ROUTE_SERVICE: Record<string, AuditServiceCode> = {
  flt: 'FLT',
  gymnasium: 'GYMNASIUM',
  nexus: 'NEXUS',
  van: 'VAN',
  maintenance: 'MAINTENANCE',
  users: 'USERS',
  equipments: 'EQUIPMENTS',
  vehicles: 'VEHICLES',
  drivers: 'DRIVERS',
};

export const AUDIT_SERVICE_LABELS: Record<AuditServiceCode, string> = {
  FLT: 'FLT Theater',
  GYMNASIUM: 'Gymnasium',
  NEXUS: 'Nexus Room',
  VAN: 'University Van',
  MAINTENANCE: 'Maintenance',
  USERS: 'Users',
  EQUIPMENTS: 'Equipments',
  VEHICLES: 'Vehicles',
  DRIVERS: 'Drivers',
};
