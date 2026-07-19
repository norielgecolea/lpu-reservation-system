export interface UserRow {
  username: string;
  fullname: string;
  role: string;
  email: string;
  employeeId: string;
  status: string;
}

export interface PopulateUsersResponse {
  success: boolean;
  message: string;
  users: UserRow[];
}

export interface CreateAccountRequest {
  username: string;
  fullname: string;
  role: string;
  email: string;
  employeeId: string;
  passwordHash: string;
  status: string;
}

export interface UpdateUserRequest {
  oldEmployeeId: string;
  employeeId: string;
  fullname: string;
  username: string;
  email: string;
  role: string;
}

export interface AccountStatementResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  employeeId: string;
  newPassword: string;
}
