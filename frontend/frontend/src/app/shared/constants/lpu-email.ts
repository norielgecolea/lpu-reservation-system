export const LPU_LAGUNA_EMAIL_DOMAIN = '@lpulaguna.edu.ph';

export function isLpuLagunaEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(LPU_LAGUNA_EMAIL_DOMAIN);
}
