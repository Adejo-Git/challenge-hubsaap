/**
 * @file permission-rbac.service.ts
 * @description Service principal de RBAC: hasRole, hasPermission, resolveGrants, explain.
 *
 * GUARDRAILS:
 * - Não decide acesso final (isso é access-decision)
 * - Não integra com Router/guards diretamente
 * - Sem HttpClient
 * - Não interpreta ABAC/policies
 *
 * Responsabilidades:
 * - Resolver grants efetivos usando ClaimsLite + estratégia configurada
 * - Expor hasRole/hasPermission (singular e múltiplo)
 * - Cache de grants por sessão+contexto
 * - explain() sem dados sensíveis
 */

import { Injectable, Optional, Inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import {
  ClaimsLite,
  RbacConfig,
  PermissionKey,
  RoleKey,
  Grants,
  ExplainResult,
  CheckOptions,
} from './permission-rbac.model';
import {
  normalizePermissions,
  normalizeRoles,
  isValidPermissionKey,
  isValidRoleKey,
  createGrants,
  hasRoleInList,
} from './permission-rbac.util';
import { PermissionMap, resolveMultiRolePermissions } from './permission-map';
import { PermissionRbacCache, defaultRbacCache } from './permission-rbac.cache';
import {
  UnsupportedRbacStrategyError,
  NoSessionError,
} from './permission-rbac.errors';

/**
 * Token de injeção para fornecer adaptador reativo de sessão (auth-session).
 * Uso opcional: se fornecido, sincroniza claims automaticamente.
 */
export const AUTH_SESSION_ADAPTER_TOKEN = Symbol('AuthSessionAdapter');

/**
 * Contrato para adaptador reativo de sessão.
 * Implementação esperada: wrapper de AuthSessionService.session$.
 */
export interface AuthSessionAdapter {
  session$(): Observable<{ claims: ClaimsLite | null }>;
}

/**
 * Service de RBAC (Role-Based Access Control).
 *
 * Uso:
 * ```typescript
 * constructor(private rbac: PermissionRbacService) {}
 *
 * // Checar role
 * if (this.rbac.hasRole('ADMIN')) { ... }
 *
 * // Checar permission
 * if (this.rbac.hasPermission('tool.pip.write')) { ... }
 *
 * // Explain decisão
 * const result = this.rbac.explain('tool.nonexistent.action');
 * console.log(result.code, result.message);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionRbacService {
  private config: RbacConfig = {
    strategy: 'claims-only',
    enableCache: true,
    enableTelemetry: false,
  };

  private cache: PermissionRbacCache = defaultRbacCache;
  private currentClaims: ClaimsLite | null = null;
  private currentContextKey: string | null = null;
  private permissionMap: PermissionMap | null = null;
  private sessionSubscription: Subscription | null = null;

  constructor(
    @Optional() providedConfig?: RbacConfig,
    @Optional() providedCache?: PermissionRbacCache,
    @Optional() providedMap?: PermissionMap,
    @Optional() @Inject(AUTH_SESSION_ADAPTER_TOKEN) authSessionAdapter?: AuthSessionAdapter
  ) {
    if (providedConfig) {
      this.config = { ...this.config, ...providedConfig };
    }
    if (providedCache) {
      this.cache = providedCache;
    }
    if (providedMap) {
      this.permissionMap = providedMap;
    }

    // Inicializar adaptador reativo de sessão (opcional)
    if (authSessionAdapter) {
      this.subscribeToAuthSession(authSessionAdapter);
    }
  }

  /**
   * Sincronizar automaticamente com AuthSessionService via Observable.
   * Reduz wiring manual: setSession é chamado cada vez que session$ muda.
   *
   * @param adapter Implementação de AuthSessionAdapter
   */
  private subscribeToAuthSession(adapter: AuthSessionAdapter): void {
    this.sessionSubscription = adapter.session$().subscribe((session) => {
      if (session.claims) {
        this.setSession(session.claims);
      } else {
        this.clearSession();
      }
    });
  }

  /**
   * Destruir: limpar subscription e sessão.
   * Deve ser chamado em ngOnDestroy se o adaptador for fornecido.
   */
  ngOnDestroy(): void {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
    this.clearSession();
  }

  /**
   * Configurar sessão/claims atuais.
   * Deve ser chamado ao inicializar/trocar sessão.
   *
   * @param claims ClaimsLite da sessão
   */
  setSession(claims: ClaimsLite): void {
    // Invalidar cache da sessão ATUAL (antiga) antes de trocar
    if (this.currentClaims && this.config.enableCache) {
      this.cache.clearBySession(this.currentClaims.sessionId);
    }

    this.currentClaims = claims;
  }

  /**
   * Configurar contexto atual (tenant/project/etc.).
   * Deve ser chamado ao trocar contexto.
   *
   * @param contextKey Identificador do contexto
   */
  setContext(contextKey: string): void {
    // Se contexto mudou, invalidar cache do contexto anterior
    if (
      this.config.enableCache &&
      this.currentClaims &&
      this.currentContextKey &&
      this.currentContextKey !== contextKey
    ) {
      this.cache.clearBySessionAndContext(
        this.currentClaims.sessionId,
        this.currentContextKey
      );
    }

    this.currentContextKey = contextKey;
  }

  /**
   * Limpar sessão e cache.
   */
  clearSession(): void {
    if (this.currentClaims && this.config.enableCache) {
      this.cache.clearBySession(this.currentClaims.sessionId);
    }
    this.currentClaims = null;
    this.currentContextKey = null;
  }

  /**
   * Configurar PermissionMap (para estratégia map-based).
   *
   * @param map PermissionMap
   */
  setPermissionMap(map: PermissionMap): void {
    this.permissionMap = map;
  }

  /**
   * Checar se o usuário possui um ou mais roles.
   *
   * @param roles RoleKey ou array de RoleKeys
   * @param options Opções de checagem (behavior: any|all)
   * @returns true se possui, false caso contrário
   */
  hasRole(roles: RoleKey | RoleKey[], options?: CheckOptions): boolean {
    if (!this.currentClaims) {
      return false;
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    const normalized = normalizeRoles(roleArray);

    if (normalized.length === 0) {
      return false;
    }

    // Validar roles
    const invalidRoles = normalized.filter((r) => !isValidRoleKey(r));
    if (invalidRoles.length > 0) {
      return false;
    }

    const userRoles = normalizeRoles([
      ...(this.currentClaims.roles || []),
      ...(this.currentClaims.groups || []),
    ]);

    const behavior = options?.behavior || 'any';

    if (behavior === 'any') {
      // Retorna true se qualquer role for válida (OR)
      return normalized.some((role) => hasRoleInList(role, userRoles));
    } else {
      // Retorna true somente se todas as roles forem válidas (AND)
      return normalized.every((role) => hasRoleInList(role, userRoles));
    }
  }

  /**
   * Checar se o usuário possui uma ou mais permissões.
   *
   * @param permissions PermissionKey ou array de PermissionKeys
   * @param options Opções de checagem (behavior: any|all)
   * @returns true se possui, false caso contrário
   */
  hasPermission(
    permissions: PermissionKey | PermissionKey[],
    options?: CheckOptions
  ): boolean {
    if (!this.currentClaims) {
      return false;
    }

    const permArray = Array.isArray(permissions) ? permissions : [permissions];
    const normalized = normalizePermissions(permArray);

    if (normalized.length === 0) {
      return false;
    }

    // Validar permissions
    const invalidPerms = normalized.filter((p) => !isValidPermissionKey(p));
    if (invalidPerms.length > 0) {
      return false;
    }

    const grants = this.resolveGrants();

    const behavior = options?.behavior || 'any';

    if (behavior === 'any') {
      // Retorna true se qualquer permission for válida (OR)
      return normalized.some((perm) => grants.has(perm));
    } else {
      // Retorna true somente se todas as permissions forem válidas (AND)
      return normalized.every((perm) => grants.has(perm));
    }
  }

  /**
   * Resolver grants efetivos do usuário atual (com cache).
   *
   * @returns Set de PermissionKeys concedidas
   */
  resolveGrants(): Grants {
    if (!this.currentClaims) {
      return new Set();
    }

    // Checar cache
    if (this.config.enableCache) {
      const cached = this.cache.get(
        this.currentClaims.sessionId,
        this.currentContextKey || undefined
      );
      if (cached) {
        return cached;
      }
    }

    // Resolver grants baseado na estratégia
    let grants: Grants;

    try {
      grants = this.resolveGrantsByStrategy();
    } catch {
      // Em caso de erro, retornar grants vazio (fluxo determinístico)
      // Erros são propagados para access-decision ou capturados por telemetria externa
      grants = new Set();
    }

    // Armazenar no cache
    if (this.config.enableCache) {
      this.cache.set(
        this.currentClaims.sessionId,
        grants,
        this.currentContextKey || undefined
      );
    }

    return grants;
  }

  /**
   * Explicar decisão de allow/deny para uma permissão.
   *
   * @param permission PermissionKey a explicar
   * @returns ExplainResult com código e mensagem técnica (sem dados sensíveis)
   */
  explain(permission: PermissionKey): ExplainResult {
    // Validar permission key
    if (!isValidPermissionKey(permission)) {
      return {
        code: 'invalid-key',
        message: `PermissionKey inválida: "${permission}"`,
        details: { permission },
      };
    }

    // Checar sessão
    if (!this.currentClaims) {
      return {
        code: 'no-session',
        message: 'Sessão não disponível para resolução de permissões.',
      };
    }

    // Resolver grants
    const grants = this.resolveGrants();

    // Checar se permissão está nos grants
    if (grants.has(permission)) {
      return {
        code: 'granted',
        message: `Permissão "${permission}" concedida.`,
        details: { permission },
      };
    } else {
      return {
        code: 'missing-permission',
        message: `Permissão "${permission}" ausente nos grants do usuário.`,
        details: { permission },
      };
    }
  }

  /**
   * Explicar decisão de allow/deny para um role.
   *
   * @param role RoleKey a explicar
   * @returns ExplainResult com código e mensagem técnica (sem dados sensíveis)
   */
  explainRole(role: RoleKey): ExplainResult {
    // Validar role key
    if (!isValidRoleKey(role)) {
      return {
        code: 'invalid-key',
        message: `RoleKey inválida: "${role}"`,
        details: { role },
      };
    }

    // Checar sessão
    if (!this.currentClaims) {
      return {
        code: 'no-session',
        message: 'Sessão não disponível para resolução de roles.',
      };
    }

    // Normalizar roles do usuário
    const userRoles = normalizeRoles([
      ...(this.currentClaims.roles || []),
      ...(this.currentClaims.groups || []),
    ]);

    // Checar se role está presente
    if (hasRoleInList(role, userRoles)) {
      return {
        code: 'granted',
        message: `Role "${role}" presente no usuário.`,
        details: { role },
      };
    } else {
      return {
        code: 'missing-role',
        message: `Role "${role}" ausente no usuário.`,
        details: { role },
      };
    }
  }

  /**
   * Resolver grants baseado na estratégia configurada.
   *
   * @returns Grants efetivos
   */
  private resolveGrantsByStrategy(): Grants {
    if (!this.currentClaims) {
      throw new NoSessionError();
    }

    switch (this.config.strategy) {
      case 'claims-only':
        return this.resolveGrantsClaimsOnly();

      case 'map-based':
        return this.resolveGrantsMapBased();

      case 'hybrid':
        return this.resolveGrantsHybrid();

      default:
        throw new UnsupportedRbacStrategyError(this.config.strategy);
    }
  }

  /**
   * Estratégia claims-only: permissões já vêm no token.
   *
   * @returns Grants diretos de ClaimsLite
   */
  private resolveGrantsClaimsOnly(): Grants {
    if (!this.currentClaims) {
      return new Set();
    }

    const permissions = this.currentClaims.permissions || [];
    return createGrants(permissions);
  }

  /**
   * Estratégia map-based: permissões derivadas de roles via PermissionMap.
   *
   * @returns Grants derivados do mapa
   */
  private resolveGrantsMapBased(): Grants {
    if (!this.currentClaims) {
      return new Set();
    }

    if (!this.permissionMap) {
      // PermissionMap ausente: retornar grants vazio (fluxo seguro)
      // Logs/telemetria devem ser capturados externamente se necessário
      return new Set();
    }

    const roles = [
      ...(this.currentClaims.roles || []),
      ...(this.currentClaims.groups || []),
    ];

    return resolveMultiRolePermissions(roles, this.permissionMap);
  }

  /**
   * Estratégia hybrid: combina claims diretas + mapa.
   *
   * @returns Grants mesclados (claims + map)
   */
  private resolveGrantsHybrid(): Grants {
    const claimsGrants = this.resolveGrantsClaimsOnly();
    const mapGrants = this.resolveGrantsMapBased();

    // Merge ambos
    const merged = new Set<PermissionKey>();
    claimsGrants.forEach((p) => merged.add(p));
    mapGrants.forEach((p) => merged.add(p));

    return merged;
  }
}
