/**
 * @file permission-rbac.auth-session-adapter.ts
 * @description Adaptador reativo para integração com AuthSessionService.
 *
 * Reduz wiring manual: sincroniza claims automaticamente quando session$ muda.
 * Uso: fornecer via AUTH_SESSION_ADAPTER_TOKEN ao PermissionRbacService.
 */
import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
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
let AuthSessionRbacAdapter = class AuthSessionRbacAdapter {
    authSession;
    constructor(authSession) {
        this.authSession = authSession;
    }
    /**
     * Retornar Observable com claims extraído de AuthSessionService.
     * A subscription é gerenciada por PermissionRbacService.
     *
     * @returns Observable<{ claims: ClaimsLite | null }>
     */
    session$() {
        return this.authSession.session$.pipe(map((state) => ({
            claims: state.claims || null,
        })));
    }
};
AuthSessionRbacAdapter = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Object])
], AuthSessionRbacAdapter);
export { AuthSessionRbacAdapter };
//# sourceMappingURL=permission-rbac.auth-session-adapter.js.map