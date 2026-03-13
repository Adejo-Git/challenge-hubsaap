import { Injectable } from '@angular/core';

/**
 * ObservabilityServiceMock
 * 
 * Mock do ObservabilityService da Shared Libs.
 * Simula registro de eventos, erros e métricas.
 * 
 * TODO: Substituir por @hub/shared/observability quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class ObservabilityServiceMock {
  /**
   * Registra evento de rastreamento.
   */
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    console.log(`[Observability] Event: ${eventName}`, properties || {});
  }

  /**
   * Registra erro para monitoramento.
   */
  trackError(errorName: string, error: unknown, properties?: Record<string, unknown>): void {
    console.error(`[Observability] Error: ${errorName}`, error, properties || {});
  }

  /**
   * Captura exceção para monitoramento (compatível com ObservabilityService real).
   */
  captureException(error: unknown, context?: { code?: string; extra?: unknown; url?: string }): void {
    console.error(`[Observability] Exception:`, error, context || {});
  }

  /**
   * Registra métrica de performance.
   */
  trackMetric(metricName: string, value: number, properties?: Record<string, unknown>): void {
    console.log(`[Observability] Metric: ${metricName} = ${value}`, properties || {});
  }

  /**
   * Alias de trackEvent para compatibilidade com guards que usam logEvent.
   * TODO: Remover quando o guard migrar para trackEvent.
   */
  logEvent(eventName: string, properties?: Record<string, unknown>): void {
    this.trackEvent(eventName, properties);
  }
}
