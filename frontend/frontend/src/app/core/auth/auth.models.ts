export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface UpdateProfileRequest {
  fullname: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

/** Bookable admin services a role may access. */
export type ServiceCode = 'FLT' | 'GYMNASIUM' | 'VAN' | 'NEXUS';

export interface AuthResponse {
  success: boolean;
  message: string;
  role: string;
  username: string;
  token: string;
  email: string;
  fullname: string;
  empId: string;
  services?: string[];
  homePath?: string | null;
}

export interface AuthUser {
  username: string;
  role: string;
  email: string;
  fullname: string;
  empId: string;
  services: ServiceCode[];
  homePath: string | null;
}
