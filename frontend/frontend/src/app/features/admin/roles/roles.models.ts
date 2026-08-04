export interface AppRoleRow {
  code: string;
  label: string;
  system: boolean;
  homePath: string;
  services: string[];
  userCount: number;
}

export interface RoleManagementResponse {
  success: boolean;
  message: string;
  roles?: AppRoleRow[];
  role?: AppRoleRow;
}

export interface CreateAppRolePayload {
  code: string;
  label: string;
  services: string[];
}

export interface UpdateAppRolePayload {
  label: string;
  services: string[];
}
