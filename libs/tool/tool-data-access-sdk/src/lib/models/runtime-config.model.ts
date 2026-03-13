/**
 * Runtime Config Model
 * 
 * Configuração de runtime para endpoints e baseUrl.
 * Injetável e testável.
 * 
 * Responsabilidades:
 * - Definir estrutura de config runtime
 * - Prover baseUrl por ambiente
 * - Prover endpoints por tool/recurso
 * 
 * Não-responsabilidades:
 * - Implementar lógica de carregamento (isso é provider/service)
 * - Hardcode de valores (devem vir de ambiente)
 */

import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  readonly baseUrl: string;
  readonly endpoints?: Record<string, string>;
  readonly timeout?: number;
  readonly retryAttempts?: number;
}

export const TOOL_DATA_ACCESS_CONFIG = new InjectionToken<RuntimeConfig>(
  'TOOL_DATA_ACCESS_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({
      baseUrl: '',
      timeout: 30000,
      retryAttempts: 0,
    }),
  }
);
