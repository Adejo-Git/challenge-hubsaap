/**
 * Error Mapper
 * 
 * Normaliza erros HTTP/network/timeout para ToolDataError.
 * Preserva correlationId quando disponível.
 * 
 * Responsabilidades:
 * - Mapear HttpErrorResponse para ToolDataError
 * - Mapear erros de rede/timeout
 * - Extrair correlationId de headers quando disponível
 * - Prover funções puras e testáveis
 * 
 * Não-responsabilidades:
 * - Decidir UX/UI de erro (isso é componente)
 * - Implementar retry (isso é interceptor/policy)
 */

import { HttpErrorResponse } from '@angular/common/http';
import { ErrorCategory, ToolDataError } from './tool-data-error.model';

/**
 * Mapeia HttpErrorResponse para ToolDataError
 */
export function mapHttpError(error: HttpErrorResponse): ToolDataError {
  const correlationId = extractCorrelationId(error);

  // Network error (ex: offline, CORS)
  if (error.status === 0) {
    return new ToolDataError({
      category: ErrorCategory.Network,
      code: 'NETWORK_ERROR',
      message: 'Erro de rede. Verifique sua conexão.',
      correlationId,
      originalError: error,
    });
  }

  // Timeout
  if (error.error instanceof ProgressEvent) {
    return new ToolDataError({
      category: ErrorCategory.Timeout,
      code: 'TIMEOUT',
      message: 'A requisição excedeu o tempo limite.',
      correlationId,
      originalError: error,
    });
  }

  // Categoria por status HTTP
  const category = categorizeHttpStatus(error.status);
  const code = `HTTP_${error.status}`;
  const message = extractErrorMessage(error);

  return new ToolDataError({
    category,
    code,
    message,
    correlationId,
    details: error.error,
    originalError: error,
  });
}

/**
 * Categoriza status HTTP em ErrorCategory
 */
function categorizeHttpStatus(status: number): ErrorCategory {
  if (status === 400 || status === 422) {
    return ErrorCategory.Validation;
  }
  if (status === 401 || status === 403) {
    return ErrorCategory.Authorization;
  }
  if (status === 404) {
    return ErrorCategory.NotFound;
  }
  if (status === 408 || status === 504) {
    return ErrorCategory.Timeout;
  }
  if (status >= 500) {
    return ErrorCategory.ServerError;
  }
  return ErrorCategory.Unknown;
}

/**
 * Extrai mensagem de erro do HttpErrorResponse
 */
function extractErrorMessage(error: HttpErrorResponse): string {
  // Tentar extrair mensagem do corpo da resposta
  if (error.error && typeof error.error === 'object') {
    const body = error.error as Record<string, unknown>;
    if (typeof body['message'] === 'string') {
      return body['message'];
    }
    if (typeof body['error'] === 'string') {
      return body['error'];
    }
  }

  // Fallback: mensagem padrão por status
  if (error.status === 401) {
    return 'Não autorizado. Faça login novamente.';
  }
  if (error.status === 403) {
    return 'Acesso negado.';
  }
  if (error.status === 404) {
    return 'Recurso não encontrado.';
  }
  if (error.status >= 500) {
    return 'Erro no servidor. Tente novamente mais tarde.';
  }

  return error.message || 'Erro desconhecido.';
}

/**
 * Extrai correlationId de headers HTTP
 */
function extractCorrelationId(error: HttpErrorResponse): string | undefined {
  return (
    error.headers.get('X-Correlation-Id') ??
    error.headers.get('x-correlation-id') ??
    undefined
  );
}

/**
 * Mapeia erro genérico (não-HTTP) para ToolDataError
 */
export function mapGenericError(error: unknown): ToolDataError {
  if (error instanceof ToolDataError) {
    return error;
  }

  if (error instanceof Error) {
    return new ToolDataError({
      category: ErrorCategory.Unknown,
      code: 'GENERIC_ERROR',
      message: error.message,
      originalError: error,
    });
  }

  return new ToolDataError({
    category: ErrorCategory.Unknown,
    code: 'UNKNOWN_ERROR',
    message: 'Erro desconhecido.',
    originalError: error,
  });
}
