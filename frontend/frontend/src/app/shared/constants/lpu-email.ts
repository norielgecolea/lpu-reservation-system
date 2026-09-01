export const LPU_LAGUNA_EMAIL_DOMAIN = '@lpulaguna.edu.ph';
export const LPU_SC_EMAIL_DOMAIN = '@lpusc.edu.ph';

export const UNIVERSITY_EMAIL_DOMAINS = [
  LPU_LAGUNA_EMAIL_DOMAIN,
  LPU_SC_EMAIL_DOMAIN,
] as const;

export const UNIVERSITY_EMAIL_DOMAINS_LABEL = '@lpulaguna.edu.ph or @lpusc.edu.ph';

export function isLpuLagunaEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(LPU_LAGUNA_EMAIL_DOMAIN);
}

export function isUniversityEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return UNIVERSITY_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
}
