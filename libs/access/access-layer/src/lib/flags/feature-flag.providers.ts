import { Provider, InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagsAdapter } from './feature-flag.adapters';

/**
 * Token de injeção para o FeatureFlagsAdapter
 * Permite substituir a implementação do adapter em testes ou diferentes contextos
 */
export const FEATURE_FLAGS_ADAPTER_TOKEN = new InjectionToken<FeatureFlagsAdapter>(
  'FEATURE_FLAGS_ADAPTER_TOKEN'
);

/**
 * Token de injeção para invalidação de contexto
 * Observable que emite quando o contexto muda e as flags devem ser recalculadas
 */
export const CONTEXT_INVALIDATION_TOKEN = new InjectionToken<Observable<void>>(
  'CONTEXT_INVALIDATION_TOKEN'
);

/**
 * Token de injeção para snapshot de contexto
 * Função que retorna o contexto atual para recálculo de flags
 */
export const CONTEXT_SNAPSHOT_TOKEN = new InjectionToken<() => Record<string, unknown> | null>(
  'CONTEXT_SNAPSHOT_TOKEN'
);

/**
 * Configuração opcional para o FeatureFlagService
 */
export interface FeatureFlagServiceConfig {
  /** Adapter customizado (se não fornecido, deve ser registrado via FEATURE_FLAGS_ADAPTER_TOKEN) */
  adapter?: FeatureFlagsAdapter;
  /** Observable de invalidação de contexto */
  contextInvalidation$?: Observable<void>;
  /** Função para obter snapshot do contexto atual */
  contextSnapshotFn?: () => Record<string, unknown> | null;
}

/**
 * Factory para criar o FeatureFlagService com wiring consistente
 * 
 * @example Uso básico com adapter registrado
 * ```typescript
 * providers: [
 *   { provide: FEATURE_FLAGS_ADAPTER_TOKEN, useClass: MyFeatureFlagsAdapter },
 *   provideFeatureFlagService()
 * ]
 * ```
 * 
 * @example Uso avançado com contexto
 * ```typescript
 * providers: [
 *   { provide: FEATURE_FLAGS_ADAPTER_TOKEN, useClass: MyFeatureFlagsAdapter },
 *   provideFeatureFlagService({
 *     contextInvalidation$: inject(ContextService).contextChange$,
 *     contextSnapshotFn: () => inject(ContextService).snapshot()
 *   })
 * ]
 * ```
 * 
 * @param config Configuração opcional do serviço
 * @returns Provider do Angular para o FeatureFlagService
 */
export function provideFeatureFlagService(config?: FeatureFlagServiceConfig): Provider {
  return {
    provide: FeatureFlagService,
    useFactory: (
      adapter: FeatureFlagsAdapter,
      contextInvalidation$?: Observable<void>,
      contextSnapshotFn?: () => Record<string, unknown> | null
    ) => {
      const finalAdapter = config?.adapter ?? adapter;
      const finalContextInvalidation$ = config?.contextInvalidation$ ?? contextInvalidation$;
      const finalContextSnapshotFn = config?.contextSnapshotFn ?? contextSnapshotFn;
      
      return new FeatureFlagService(
        finalAdapter,
        finalContextInvalidation$,
        finalContextSnapshotFn
      );
    },
    deps: [
      FEATURE_FLAGS_ADAPTER_TOKEN,
      [CONTEXT_INVALIDATION_TOKEN, { optional: true }],
      [CONTEXT_SNAPSHOT_TOKEN, { optional: true }],
    ],
  };
}

/**
 * Provider standalone mínimo sem integração com contexto
 * Útil para testes ou apps que não usam ContextService
 * 
 * @example
 * ```typescript
 * providers: [
 *   { provide: FEATURE_FLAGS_ADAPTER_TOKEN, useClass: MockFeatureFlagsAdapter },
 *   provideFeatureFlagServiceStandalone()
 * ]
 * ```
 */
export function provideFeatureFlagServiceStandalone(): Provider {
  return {
    provide: FeatureFlagService,
    useFactory: (adapter: FeatureFlagsAdapter) => {
      return new FeatureFlagService(adapter);
    },
    deps: [FEATURE_FLAGS_ADAPTER_TOKEN],
  };
}
