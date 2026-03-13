/**
 * @file index.ts
 * @description Entrypoint público da lib permission-rbac.
 *
 * Exporta a API pública para consumo em outros módulos/libs/apps.
 */
// Models & Contracts
export * from './lib/permission-rbac.model';
// Service (principal)
export * from './lib/permission-rbac.service';
// Adaptador reativo para auth-session (opcional)
export * from './lib/permission-rbac.auth-session-adapter';
// Errors
export * from './lib/permission-rbac.errors';
// Utils
export * from './lib/permission-rbac.util';
// PermissionMap (para estratégia map-based)
export * from './lib/permission-map';
// Cache (exportar se necessário DI customizada; normalmente não é necessário)
export { PermissionRbacCache } from './lib/permission-rbac.cache';
//# sourceMappingURL=index.js.map