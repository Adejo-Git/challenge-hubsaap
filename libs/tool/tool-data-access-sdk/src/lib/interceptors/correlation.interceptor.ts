/**
 * Correlation Interceptor
 * 
 * Adiciona header X-Correlation-Id em todas as requisições.
 * Gera ID único se não existir.
 * 
 * Responsabilidades:
 * - Adicionar correlationId em headers
 * - Gerar UUID se não fornecido
 * - Permitir configuração opcional
 * 
 * Não-responsabilidades:
 * - Implementar retry
 * - Implementar cache
 * - Decidir lógica de negócio
 */

import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Gera UUID simples v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.trunc(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const correlationInterceptor: HttpInterceptorFn = (req, next) => {
  // Adicionar correlationId se não existir
  if (!req.headers.has('X-Correlation-Id')) {
    const correlationId = generateUUID();
    const clonedReq = req.clone({
      headers: req.headers.set('X-Correlation-Id', correlationId),
    });
    return next(clonedReq);
  }

  return next(req);
};
