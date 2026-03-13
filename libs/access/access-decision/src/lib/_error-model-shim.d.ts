// Shim local para garantir que o build do access-decision resolve '@hub/error-model' via types,
// mesmo quando o executor @nx/js:tsc não aplica o "paths" do tsconfig.base durante o build.
//
// IMPORTANTE: isto NÃO substitui o runtime bundler/resolver. É apenas para compilação.
// Mantém o contrato mínimo que access-decision consome do error-model.

declare module '@hub/error-model' {
  export type DenyReason =
    | 'unauthenticated'
    | 'forbidden'
    | 'notFound'
    | 'flagOff'
    | 'contextMissing'
    | 'dependencyMissing'
    | string;

  export interface StandardError {
    category: string;
    code: string;
    severity: string;
    userMessage: string;
    technicalMessage?: string;
    correlationId?: string;
    detailsSafe?: unknown;
    timestamp: string;
    source?: string;
  }

  export function fromDenyReason(reason: DenyReason, correlationId?: string): StandardError;
}

