/**
 * ToolDataError Model
 * 
 * Erro padronizado para camada de dados.
 * Inclui categoria, código, mensagem e correlationId.
 * 
 * Responsabilidades:
 * - Estruturar erro padronizado
 * - Prover categorias consistentes
 * - Incluir correlação para troubleshooting
 * 
 * Não-responsabilidades:
 * - Implementar lógica de mapeamento (isso é ErrorMapper)
 * - Decidir tratamento UI (isso é componente)
 */

export enum ErrorCategory {
  Network = 'NETWORK',
  Validation = 'VALIDATION',
  Authorization = 'AUTHORIZATION',
  NotFound = 'NOT_FOUND',
  ServerError = 'SERVER_ERROR',
  Timeout = 'TIMEOUT',
  Unknown = 'UNKNOWN',
}

export interface ToolDataErrorOptions {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly correlationId?: string;
  readonly details?: Record<string, unknown>;
  readonly originalError?: unknown;
}

export class ToolDataError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly correlationId?: string;
  readonly details?: Record<string, unknown>;
  readonly originalError?: unknown;

  constructor(options: ToolDataErrorOptions) {
    super(options.message);
    this.name = 'ToolDataError';
    this.category = options.category;
    this.code = options.code;
    this.correlationId = options.correlationId;
    this.details = options.details;
    this.originalError = options.originalError;

    // Manter stack trace correto
    const maybeCapture = (Error as unknown as { captureStackTrace?: (target: object, ctor?: unknown) => void }).captureStackTrace;
    if (typeof maybeCapture === 'function') {
      maybeCapture(this, ToolDataError);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      category: this.category,
      code: this.code,
      message: this.message,
      correlationId: this.correlationId,
      details: this.details,
    };
  }
}
