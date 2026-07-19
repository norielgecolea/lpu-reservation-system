import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/** Attaches the backend's `Authorization: LpuL <token>` scheme. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  if (token) {
    req = req.clone({ setHeaders: { Authorization: `LpuL ${token}` } });
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
        void router.navigateByUrl('/login', { replaceUrl: true });
      }

      return throwError(() => error);
    }),
  );
};
