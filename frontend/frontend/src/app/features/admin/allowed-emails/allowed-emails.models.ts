export interface AllowedEmailRow {
  id: number;
  email: string;
  status: string;
  createdAt?: string;
  createdBy?: string;
}

export interface PopulateAllowedEmailsResponse {
  success: boolean;
  message?: string;
  emails?: AllowedEmailRow[];
  totalCount?: number;
}

export interface CreateAllowedEmailRequest {
  email: string;
}

export interface ImportAllowedEmailsRequest {
  emails: string[];
}

export interface SimpleApiResponse {
  success: boolean;
  message?: string;
}

export interface EmailCheckResponse {
  success: boolean;
  allowed: boolean;
  message?: string;
}
