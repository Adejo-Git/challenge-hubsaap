/**
 * @file permission-rbac.errors.ts
 * @description Erros padronizados para o sistema RBAC.
 *
 * GUARDRAILS:
 * - Sem dados sensíveis (tokens, claims completas)
 * - Mensagens técnicas e minimalistas
 * - Integração com error-model do projeto
 */

import {
  ErrorCategory,
  Severity,
  StandardError,
} from '@hub/error-model';

/**
 * Erro: PermissionKey inválida (não passa na validação).
 */
export class InvalidPermissionKeyError extends Error {
  public readonly code = 'INVALID_PERMISSION_KEY';

  constructor(
    public readonly key: string,
    message?: string
  ) {
    super(
      message ||
        `PermissionKey inválida: "${key}". Deve seguir formato "scope.resource.action" (a-z, 0-9, ., -, _).`
    );
    this.name = 'InvalidPermissionKeyError';
    Object.setPrototypeOf(this, InvalidPermissionKeyError.prototype);
  }
}

/**
 * Erro: RoleKey inválida (não passa na validação).
 */
export class InvalidRoleKeyError extends Error {
  public readonly code = 'INVALID_ROLE_KEY';

  constructor(
    public readonly key: string,
    message?: string
  ) {
    super(
      message ||
        `RoleKey inválida: "${key}". Deve conter somente letras, números, hífen ou underscore (2-50 caracteres).`
    );
    this.name = 'InvalidRoleKeyError';
    Object.setPrototypeOf(this, InvalidRoleKeyError.prototype);
  }
}

/**
 * Erro: Configuração de RBAC inválida.
 */
export class InvalidRbacConfigError extends Error {
  public readonly code = 'INVALID_RBAC_CONFIG';

  constructor(
    message: string,
    public readonly issues?: string[]
  ) {
    super(message);
    this.name = 'InvalidRbacConfigError';
    Object.setPrototypeOf(this, InvalidRbacConfigError.prototype);
  }
}

/**
 * Erro: Estratégia RBAC não suportada.
 */
export class UnsupportedRbacStrategyError extends Error {
  public readonly code = 'UNSUPPORTED_RBAC_STRATEGY';

  constructor(
    public readonly strategy: string,
    message?: string
  ) {
    super(
      message ||
        `Estratégia RBAC não suportada: "${strategy}". Estratégias válidas: "claims-only", "map-based", "hybrid".`
    );
    this.name = 'UnsupportedRbacStrategyError';
    Object.setPrototypeOf(this, UnsupportedRbacStrategyError.prototype);
  }
}

/**
 * Erro: Sessão não disponível ou inválida.
 */
export class NoSessionError extends Error {
  public readonly code = 'NO_SESSION';

  constructor(message?: string) {
    super(message || 'Sessão não disponível para resolução de permissões RBAC.');
    this.name = 'NoSessionError';
    Object.setPrototypeOf(this, NoSessionError.prototype);
  }
}

/**
 * Erro: PermissionMap inválido (ciclos, herança quebrada, etc.).
 */
export class InvalidPermissionMapError extends Error {
  public readonly code = 'INVALID_PERMISSION_MAP';

  constructor(
    message: string,
    public readonly validationErrors?: string[]
  ) {
    super(message);
    this.name = 'InvalidPermissionMapError';
    Object.setPrototypeOf(this, InvalidPermissionMapError.prototype);
  }
}

/**
 * Helper: valida se um erro é do tipo RBAC Error.
 *
 * @param error Erro a checar
 * @returns true se for um erro RBAC conhecido
 */
export function isRbacError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const knownCodes = [
    'INVALID_PERMISSION_KEY',
    'INVALID_ROLE_KEY',
    'INVALID_RBAC_CONFIG',
    'UNSUPPORTED_RBAC_STRATEGY',
    'NO_SESSION',
    'INVALID_PERMISSION_MAP',
  ];

  return knownCodes.includes((error as { code?: string }).code || '');
}

/**
 * Helper: extrai código técnico de um erro RBAC.
 *
 * @param error Erro a processar
 * @returns Código técnico ou 'UNKNOWN_ERROR'
 */
export function extractErrorCode(error: unknown): string {
  if (isRbacError(error)) {
    return (error as { code?: string }).code || 'UNKNOWN_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Helper: gera mensagem segura de erro (sem dados sensíveis).
 *
 * @param error Erro a processar
 * @returns Mensagem segura para log/explain
 */
export function safeErrorMessage(error: unknown): string {
  if (!error) {
    return 'Erro desconhecido.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro desconhecido.';
}

/**
 * Mapper: converte erros RBAC para StandardError (integração error-model).
 *
 * @param error Erro RBAC a mapear
 * @param correlationId ID de correlação (opcional)
 * @returns StandardError compatível com error-model
 */
export function fromRbacError(
  error: unknown,
  correlationId?: string
): StandardError {
  const code = extractErrorCode(error);
  const message = safeErrorMessage(error);

  let category = ErrorCategory.PERMISSION;
  let severity = Severity.ERROR;

  // Mapear código RBAC para ErrorCode e Severity
  if (
    code === 'INVALID_PERMISSION_KEY' ||
    code === 'INVALID_ROLE_KEY' ||
    code === 'INVALID_PERMISSION_MAP' ||
    code === 'INVALID_RBAC_CONFIG'
  ) {
    category = ErrorCategory.VALIDATION;
    severity = Severity.ERROR;
  }

  if (code === 'NO_SESSION') {
    category = ErrorCategory.AUTH;
    severity = Severity.CRITICAL;
  }

  return {
    category,
    code,
    severity,
    userMessage: `Erro de permissão: ${code}`,
    technicalMessage: message,
    correlationId: correlationId || generateCorrelationId(),
    detailsSafe: { code },
    timestamp: new Date().toISOString(),
    source: 'permission-rbac',
  };
}

/**
 * Helper: gera um ID de correlação único para rastreamento.
 *
 * @returns UUID ou string aleatória
 */
function generateCorrelationId(): string {
  return `rbac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
