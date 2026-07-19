import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class uthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {

        // 👇 Handle Unauthorized globally
        if (error.status === 401) {

          // clear stored auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');

          // redirect to login
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
}