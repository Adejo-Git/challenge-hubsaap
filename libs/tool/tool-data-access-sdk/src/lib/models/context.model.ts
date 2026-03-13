/**
 * Context Model
 * 
 * Define o token de injeção para o ContextService.
 * Permite que o BaseClient integre com o ContextService sem acoplamento direto.
 */

import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Interface mínima do ContextService necessária para BaseClient
 */
export interface ContextServicePort {
  /**
   * Retorna snapshot do contexto atual
   */
  snapshot(): unknown;
  
  /**
   * Observable que emite quando o contexto é invalidado/alterado
   */
  contextInvalidation$(): Observable<void>;
}

/**
 * Token de injeção para ContextService
 * Permite dependency injection sem acoplamento direto
 */
export const CONTEXT_SERVICE_TOKEN = new InjectionToken<ContextServicePort>(
  'ContextService for ToolDataAccessSdk'
);
