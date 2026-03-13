import { Observable } from 'rxjs';
import { FlagKey, FlagSnapshotLite } from './feature-flag.model';

/**
 * Contrato esperado da shared-lib feature-flags pelo Access Layer.
 *
 * O adapter isola conversões e evita que detalhes internos da lib
 * (rules engine, overrides, merge strategy) vazem para o FeatureFlagService.
 *
 * Para conectar com a lib real, implemente esta interface e registre via DI:
 * @example
 * providers: [{ provide: FeatureFlagService, useFactory: (adapter) => new FeatureFlagService(adapter), deps: [...] }]
 */
export interface FeatureFlagsAdapter {
  /** Retorna o estado atual da flag (síncrono, sem lançar exceção para keys desconhecidas). */
  isEnabled(key: FlagKey): boolean;

  /** Observable que emite toda vez que o valor da flag muda. */
  watch(key: FlagKey): Observable<boolean>;

  /** Snapshot seguro das flags efetivas no formato lite. */
  snapshot(): FlagSnapshotLite;

  /**
   * Atualiza o contexto da engine de flags (síncrono).
   * Chamado pelo FeatureFlagService ao detectar troca de contexto.
   */
  setContextSync(ctx: Record<string, unknown>): void;

  /**
   * Retorna informações sobre a origem/razão da flag (opcional).
   * Útil para troubleshooting e telemetria.
   * @returns Objeto com origem (default/override/rule), valor efetivo e metadados.
   */
  explain?(key: FlagKey): FlagExplanation | null;
}

/**
 * Explicação da origem e estado de uma flag
 */
export interface FlagExplanation {
  key: FlagKey;
  enabled: boolean;
  source: 'default' | 'override' | 'rule' | 'unknown';
  reason?: string;
  metadata?: Record<string, unknown>;
}
