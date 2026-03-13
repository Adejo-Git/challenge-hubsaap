// Tipos lite públicos do FeatureFlagService (Access Layer).
// Não expõem internals da shared-lib feature-flags.

/** Chave de uma flag: formato obrigatório "namespace.featureName" */
export type FlagKey = string;

/** Identificador da tool (sem pontos) */
export type ToolKey = string;

/** Nome da feature dentro de uma tool (sem pontos) */
export type FeatureKey = string;

/** Estado mínimo de uma flag — apenas o que o consumidor precisa */
export interface FlagStateLite {
  enabled: boolean;
}

/**
 * Snapshot seguro e imutável das flags efetivas.
 * Não contém rules engine, overrides ou merge strategy.
 */
export interface FlagSnapshotLite {
  flags: Readonly<Record<FlagKey, FlagStateLite>>;
  version: number;
  timestamp: number;
}
