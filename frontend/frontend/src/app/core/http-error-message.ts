import { HttpErrorResponse } from '@angular/common/http';

const RATE_LIMIT_FALLBACK = 'Too many requests. Please try again shortly.';

export function isRateLimited(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 429;
}

export function httpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: unknown } | string | null | undefined;
    const fromBody =
      typeof body === 'object' && body && typeof body.message === 'string'
        ? body.message.trim()
        : '';
    if (error.status === 429) {
      return fromBody || RATE_LIMIT_FALLBACK;
    }
    if (fromBody) return fromBody;
  }
  return fallback;
}
