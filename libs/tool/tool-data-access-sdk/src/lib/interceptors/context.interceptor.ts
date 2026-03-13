/**
 * Context Interceptor
 * 
 * Adiciona headers de contexto (tenant, client, project) em requisições.
 * Integra com ContextService (quando disponível).
 * 
 * Responsabilidades:
 * - Adicionar headers de contexto ativo
 * - Integrar com ContextService via injection token
 * - Permitir configuração opcional
 * 
 * Não-responsabilidades:
 * - Implementar ContextService (isso é Access Layer)
 * - Decidir lógica de contexto (isso é ContextService)
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';
import { TOOL_DATA_ACCESS_CONFIG } from '../models/runtime-config.model';

/**
 * Contrato mínimo para ContextService
 * (evita dependência direta, usa injection token)
 */
export interface ContextSnapshot {
  readonly tenantId?: string;
  readonly clientId?: string;
  readonly projectId?: string;
}

export interface ContextProvider {
  snapshot(): ContextSnapshot;
}

export const TOOL_DATA_ACCESS_CONTEXT = new InjectionToken<ContextProvider | null>(
  'TOOL_DATA_ACCESS_CONTEXT',
  {
    providedIn: 'root',
    factory: () => null,
  }
);

export const contextInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(TOOL_DATA_ACCESS_CONFIG, { optional: true });
  const contextProvider = inject(TOOL_DATA_ACCESS_CONTEXT, { optional: true });

  // Somente aplicar em URLs do baseUrl configurado
  if (config?.baseUrl && !req.url.startsWith(config.baseUrl)) {
    return next(req);
  }

  // Adicionar headers de contexto se disponível
  if (contextProvider) {
    const context = contextProvider.snapshot();
    let headers = req.headers;

    if (context.tenantId) {
      headers = headers.set('X-Tenant-Id', context.tenantId);
    }
    if (context.clientId) {
      headers = headers.set('X-Client-Id', context.clientId);
    }
    if (context.projectId) {
      headers = headers.set('X-Project-Id', context.projectId);
    }

    const clonedReq = req.clone({ headers });
    return next(clonedReq);
  }

  return next(req);
};
