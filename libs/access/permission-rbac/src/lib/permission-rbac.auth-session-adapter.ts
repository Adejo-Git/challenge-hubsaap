/**
 * @file permission-rbac.auth-session-adapter.ts
 * @description Adaptador reativo para integração com AuthSessionService.
 *
 * Reduz wiring manual: sincroniza claims automaticamente quando session$ muda.
 * Uso: fornecer via AUTH_SESSION_ADAPTER_TOKEN ao PermissionRbacService.
 */

import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthSessionAdapter } from './permission-rbac.service';
import type { ClaimsLite } from './permission-rbac.model';

/**
 * Contrato esperado de AuthSessionService.
 * Apenas as propriedades usadas pelo adaptador.
 */
export interface AuthSessionServiceLike {
  session$: Observable<{ claims?: ClaimsLite; status?: string }>;
}

/**
 * Implementação de AuthSessionAdapter para integração com AuthSessionService.
 *
 * Uso (em app.module.ts ou root provider):
 * ```typescript
 * {
 *   provide: AUTH_SESSION_ADAPTER_TOKEN,
 *   useFactory: (authSession: AuthSessionService) =>
 *     new AuthSessionRbacAdapter(authSession),
 *   deps: [AuthSessionService],
 * }
 * ```
 */
@Injectable()
export class AuthSessionRbacAdapter implements AuthSessionAdapter {
  constructor(private authSession: AuthSessionServiceLike) {}

  /**
   * Retornar Observable com claims extraído de AuthSessionService.
   * A subscription é gerenciada por PermissionRbacService.
   *
   * @returns Observable<{ claims: ClaimsLite | null }>
   */
  session$(): Observable<{ claims: ClaimsLite | null }> {
    return this.authSession.session$.pipe(
      map((state) => ({
        claims: state.claims || null,
      }))
    );
  }
}
