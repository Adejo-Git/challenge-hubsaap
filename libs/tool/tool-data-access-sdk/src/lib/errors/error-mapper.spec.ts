/**
 * Testes: Error Mapper
 * 
 * Valida mapeamento de HttpErrorResponse para ToolDataError.
 */

import { HttpErrorResponse } from '@angular/common/http';
import { mapHttpError, mapGenericError } from './error-mapper';
import { ErrorCategory, ToolDataError } from './tool-data-error.model';

describe('ErrorMapper', () => {
  describe('mapHttpError', () => {
    it('deve mapear erro de rede (status 0)', () => {
      const httpError = new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result).toBeInstanceOf(ToolDataError);
      expect(result.category).toBe(ErrorCategory.Network);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toContain('rede');
    });

    it('deve mapear erro 400 como Validation', () => {
      const httpError = new HttpErrorResponse({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Dados inválidos' },
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result.category).toBe(ErrorCategory.Validation);
      expect(result.code).toBe('HTTP_400');
      expect(result.message).toBe('Dados inválidos');
    });

    it('deve mapear erro 401 como Authorization', () => {
      const httpError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result.category).toBe(ErrorCategory.Authorization);
      expect(result.code).toBe('HTTP_401');
      expect(result.message).toContain('autorizado');
    });

    it('deve mapear erro 404 como NotFound', () => {
      const httpError = new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result.category).toBe(ErrorCategory.NotFound);
      expect(result.code).toBe('HTTP_404');
      expect(result.message).toContain('não encontrado');
    });

    it('deve mapear erro 500 como ServerError', () => {
      const httpError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result.category).toBe(ErrorCategory.ServerError);
      expect(result.code).toBe('HTTP_500');
      expect(result.message).toContain('servidor');
    });

    it('deve extrair correlationId de headers', () => {
      const httpError = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        headers: new (require('@angular/common/http').HttpHeaders)({ 'X-Correlation-Id': 'abc-123' }),
        url: 'http://example.com/api',
      });

      const result = mapHttpError(httpError);

      expect(result.correlationId).toBe('abc-123');
    });
  });

  describe('mapGenericError', () => {
    it('deve retornar ToolDataError se já for ToolDataError', () => {
      const toolError = new ToolDataError({
        category: ErrorCategory.Validation,
        code: 'CUSTOM',
        message: 'Erro customizado',
      });

      const result = mapGenericError(toolError);

      expect(result).toBe(toolError);
    });

    it('deve mapear Error genérico', () => {
      const error = new Error('Algo deu errado');

      const result = mapGenericError(error);

      expect(result).toBeInstanceOf(ToolDataError);
      expect(result.category).toBe(ErrorCategory.Unknown);
      expect(result.message).toBe('Algo deu errado');
    });

    it('deve mapear valor desconhecido', () => {
      const result = mapGenericError('string error');

      expect(result).toBeInstanceOf(ToolDataError);
      expect(result.category).toBe(ErrorCategory.Unknown);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });
  });
});
