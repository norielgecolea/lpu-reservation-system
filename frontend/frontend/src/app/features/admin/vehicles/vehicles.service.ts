import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, map, switchMap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateVehicleRequest,
  PopulateVehiclesResponse,
  UpdateVehicleRequest,
  VehicleStatementResponse,
} from './vehicles.models';

type UpdateVehicleBody = Omit<UpdateVehicleRequest, 'image'> & { image?: string };
type CreateVehicleBody = Omit<CreateVehicleRequest, 'image'> & { image?: string };
type StatementBody = { success?: boolean | string; message?: string } | null;

export type VehicleScope = 'admin' | 'facilities';

@Injectable({ providedIn: 'root' })
export class VehiclesService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  scope(): VehicleScope {
    return this.router.url.includes('/facilities/vehicles') ? 'facilities' : 'admin';
  }

  listPath(): string {
    return this.scope() === 'facilities' ? '/facilities/vehicles' : '/vehicles';
  }

  list() {
    return this.http.get<PopulateVehiclesResponse>(`${this.base}/admin/vehicle`);
  }

  create(payload: CreateVehicleRequest) {
    return from(this.toCreateBody(payload)).pipe(
      switchMap((body) =>
        this.http.post<StatementBody>(`${this.base}/admin/createvehicle`, body, {
          observe: 'response',
        }),
      ),
      map((response) => this.statementResponse(response, 'Vehicle created')),
      catchError((err) => throwError(() => this.normalizeRequestError(err))),
    );
  }

  update(payload: UpdateVehicleRequest) {
    return from(this.toUpdateBody(payload)).pipe(
      switchMap((body) =>
        this.http.put<StatementBody>(`${this.base}/admin/updatevehicle`, body, {
          observe: 'response',
        }),
      ),
      map((response) => this.statementResponse(response, 'Vehicle updated')),
      catchError((err) => throwError(() => this.normalizeRequestError(err))),
    );
  }

  imageUrl(value: string | null | undefined): string | null {
    const source = value?.trim();

    if (!source) {
      return null;
    }

    if (/^\/?uploads\/vehicles\/default\.webp$/i.test(source)) {
      return null;
    }

    // Already a usable URL (absolute http, data:, blob:) — leave as-is.
    if (/^(data:image\/|blob:|https?:\/\/)/i.test(source)) {
      return source;
    }

    const mime = this.base64ImageMime(source);

    if (mime) {
      return `data:${mime};base64,${source}`;
    }

    // Otherwise a backend-relative path (e.g. "uploads/foo.jpg"). Images are
    // served straight off the backend host, no API context. Strip a leading
    // context segment if the backend included one.
    let path = source.replace(/^\/+/, '');
    const ctx = environment.apiUrl.replace(/^\/+/, '').replace(/\/api\/?$/, '');

    if (ctx && path.toLowerCase().startsWith(`${ctx.toLowerCase()}/`)) {
      path = path.slice(ctx.length + 1);
    }

    const origin = environment.backendUrl.replace(/\/+$/, '');

    return origin ? `${origin}/${path}` : `/${path}`;
  }

  private async toCreateBody(payload: CreateVehicleRequest): Promise<CreateVehicleBody> {
    const { image, ...body } = payload;
    const encodedImage = await this.imageBodyValue(image);

    return encodedImage ? { ...body, image: encodedImage } : body;
  }

  private async toUpdateBody(payload: UpdateVehicleRequest): Promise<UpdateVehicleBody> {
    const { image, ...body } = payload;
    const encodedImage = await this.imageBodyValue(image);

    return encodedImage ? { ...body, image: encodedImage } : body;
  }

  private statementResponse(
    response: HttpResponse<StatementBody>,
    fallbackMessage: string,
  ): VehicleStatementResponse {
    const body = response.body;
    const success = body?.success;

    if (success === false || success === 'false') {
      return {
        success: false,
        message: body?.message ?? 'Request failed',
      };
    }

    return {
      success: response.ok,
      message: body?.message ?? fallbackMessage,
    };
  }

  private async imageBodyValue(image: File | string | null | undefined): Promise<string | null> {
    if (image instanceof File) {
      return this.fileToBase64(image);
    }

    if (typeof image === 'string' && image.trim()) {
      return image;
    }

    return null;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result ?? '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  }

  private base64ImageMime(source: string): string | null {
    const clean = source.replace(/\s/g, '');

    if (clean.length < 64 || /[.\\]/.test(clean) || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      return null;
    }

    if (clean.startsWith('/9j/')) {
      return 'image/jpeg';
    }

    if (clean.startsWith('iVBORw0KGgo')) {
      return 'image/png';
    }

    if (clean.startsWith('R0lGOD')) {
      return 'image/gif';
    }

    if (clean.startsWith('UklGR')) {
      return 'image/webp';
    }

    return 'image/jpeg';
  }

  private normalizeRequestError(err: any): any {
    const error = err?.error;

    if (typeof error === 'string' && error.trim()) {
      return {
        ...err,
        error: {
          message: error,
        },
      };
    }

    return err;
  }

  remove(id: number) {
    return this.http.delete<VehicleStatementResponse>(`${this.base}/admin/deletevehicle`, {
      params: { id },
    });
  }

  toggleStatus(id: number) {
    return this.http.patch<VehicleStatementResponse>(
      `${this.base}/admin/togglevehiclestat`,
      {},
      { params: { id } },
    );
  }
}
