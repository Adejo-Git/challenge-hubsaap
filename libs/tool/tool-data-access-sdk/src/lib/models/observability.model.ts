/**
 * Observability Model
 * 
 * Contrato para integração com ObservabilityService.
 * Permite telemetria de chamadas sem vazamento de dados sensíveis.
 * 
 * Responsabilidades:
 * - Definir contrato de telemetria
 * - Prover estrutura de evento padronizada
 * 
 * Não-responsabilidades:
 * - Implementar telemetria (isso é ObservabilityService)
 * - Decidir o que registrar (isso é policy)
 */

import { InjectionToken } from '@angular/core';

export interface TelemetryEvent {
  readonly eventName: string;
  readonly timestamp?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface ObservabilityService {
  track(eventName: string, metadata?: Record<string, unknown>): void;
  trackError(error: unknown, metadata?: Record<string, unknown>): void;
}

export const TOOL_DATA_ACCESS_OBSERVABILITY = new InjectionToken<ObservabilityService | null>(
  'TOOL_DATA_ACCESS_OBSERVABILITY',
  {
    providedIn: 'root',
    factory: () => null,
  }
);
