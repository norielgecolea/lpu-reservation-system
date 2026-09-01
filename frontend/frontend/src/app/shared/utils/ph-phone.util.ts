import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Strips spaces, hyphens, parentheses, and dots used in typed phone numbers. */
export function normalizePhPhone(value: string): string {
  return value.trim().replace(/[\s\-().]/g, '');
}

/**
 * Philippine mobile and landline numbers:
 * - Mobile: 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX, or 9XXXXXXXXX
 * - Metro Manila landline: 02XXXXXXXX or +632XXXXXXXX
 * - Provincial landline: 0XXXXXXXXX or +63XXXXXXXXX (2-digit area code + 7 digits)
 */
export function isPhilippinePhoneNumber(value: string): boolean {
  const n = normalizePhPhone(value);
  if (!n) return false;

  if (/^09\d{9}$/.test(n)) return true;
  if (/^\+?639\d{9}$/.test(n)) return true;
  if (/^9\d{9}$/.test(n)) return true;

  // Area codes never start with 9 (that prefix is mobile).
  if (/^02\d{8}$/.test(n)) return true;
  if (/^\+?632\d{8}$/.test(n)) return true;

  if (/^0[3-8]\d{8}$/.test(n)) return true;
  if (/^\+?63[3-8]\d{8}$/.test(n)) return true;

  return false;
}

/** Empty values are left to `Validators.required`. */
export const philippinePhoneValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  return isPhilippinePhoneNumber(value) ? null : { phPhone: true };
};
