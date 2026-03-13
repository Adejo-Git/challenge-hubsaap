import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeatureFlagsAdapter } from './feature-flag.adapters';
import { FlagKey, ToolKey, FeatureKey, FlagSnapshotLite, FlagStateLite } from './feature-flag.model';
import { buildToolFlagKey, validateFlagKey } from './feature-flag.namespace';

/**
 * FeatureFlagService — ponto único de consumo de feature flags no Hub.
 *
 * Responsabilidades:
 * - Expor API mínima: isEnabled / watch / snapshot / tool(toolKey)
 * - Aplicar e reforçar namespace (global e toolKey.featureKey)
 * - Orquestrar recompute em troca de contexto via ContextService
 *
 * NÃO substitui autorização — flag ≠ permissão.
 * Decisão final de acesso segue no AccessDecisionService.
 *
 * Padrão de registro no Angular:
 * @example
 * providers: [{
 *   provide: FeatureFlagService,
 *   useFactory: (adapter: FeatureFlagsAdapter, ctx: ContextService) =>
 *     new FeatureFlagService(adapter, ctx.contextInvalidation$(), () => ctx.snapshot()),
 *   deps: [FEATURE_FLAGS_ADAPTER_TOKEN, ContextService]
 * }]
 */
export class FeatureFlagService {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly adapter: FeatureFlagsAdapter,
    contextInvalidation$?: Observable<void>,
    private readonly contextSnapshotFn?: () => Record<string, unknown> | null
  ) {
    if (contextInvalidation$) {
      contextInvalidation$
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.onContextChange());
    }
  }

  /**
   * Verifica se a flag está habilitada (síncrono).
   * Lança FlagValidationError para key inválida ou vazia.
   */
  isEnabled(key: FlagKey): boolean {
    // Validação centralizada como fonte única
    validateFlagKey(key);
    return this.adapter.isEnabled(key);
  }

  /**
   * Observable que emite sempre que o valor da flag muda.
   * Lança FlagValidationError para key inválida ou vazia.
   */
  watch(key: FlagKey): Observable<boolean> {
    // Validação centralizada como fonte única
    validateFlagKey(key);
    return this.adapter.watch(key);
  }

  /**
   * Retorna informações sobre a origem/razão da flag (opcional).
   * Útil para troubleshooting e telemetria.
   * @returns Objeto com origem, valor efetivo e metadados, ou null se não suportado.
   */
  explain(key: FlagKey) {
    // Validação centralizada como fonte única
    validateFlagKey(key);
    return this.adapter.explain?.(key) ?? null;
  }

  /**
   * Retorna snapshot seguro das flags efetivas.
   * Cópia rasa: alterar o retorno não afeta o estado interno.
   */
  snapshot(): FlagSnapshotLite {
    const snap = this.adapter.snapshot();
    const flags: Record<FlagKey, FlagStateLite> = {};
    for (const k of Object.keys(snap.flags)) {
      flags[k] = { ...snap.flags[k] };
    }
    return { ...snap, flags };
  }

  /**
   * Helper de ergonomia para flags de tool específica.
   * @example
   * this.flags.tool('toolA').isEnabled('export')  // verifica 'toolA.export'
   * this.flags.tool('toolA').watch('beta')         // observa 'toolA.beta'
   */
  tool(toolKey: ToolKey) {
    return {
      isEnabled: (featureKey: FeatureKey): boolean => {
        // buildToolFlagKey já valida internamente toolKey e featureKey
        const key = buildToolFlagKey(toolKey, featureKey);
        return this.adapter.isEnabled(key);
      },
      watch: (featureKey: FeatureKey): Observable<boolean> => {
        // buildToolFlagKey já valida internamente toolKey e featureKey
        const key = buildToolFlagKey(toolKey, featureKey);
        return this.adapter.watch(key);
      },
      explain: (featureKey: FeatureKey) => {
        // buildToolFlagKey já valida internamente toolKey e featureKey
        const key = buildToolFlagKey(toolKey, featureKey);
        return this.adapter.explain?.(key) ?? null;
      },
    };
  }

  /** Libera subscriptions — chamar ao destruir o consumer (ex.: ngOnDestroy). */
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onContextChange(): void {
    const ctx = this.contextSnapshotFn?.() ?? null;
    if (ctx) {
      this.adapter.setContextSync(ctx);
    }
  }
}
