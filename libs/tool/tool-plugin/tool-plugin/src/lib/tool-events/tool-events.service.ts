/**
 * Tool Events Service
 * 
 * Serviço central de publish/subscribe para eventos entre Tool e Hub.
 * Implementa namespacing por toolKey e streams globais e locais.
 */

import { Observable, Subject, filter } from 'rxjs';
import {
  ToolEvent,
  ToolEventType,
  ToolEventSeverity,
  ToolEventFilter,
  ToolEventPredicate,
  ToolLoadedMetadata,
  ToolFailedMetadata,
  FeatureUsedMetadata,
  PerformanceMarkerMetadata,
  createToolEvent,
  validateSafePayload,
} from './tool-events.model';

// Note: Avoid importing '@angular/core' at runtime to keep this lib testable in Jest without ESM transforms.
// The class remains plain and can be decorated/provided by Angular in consumer apps if needed via a thin wrapper.
export class ToolEventsService {
  /**
   * Stream global de todos os eventos
   */
  // Use explicit generic on ToolEvent payload to keep types flexible
  private readonly globalStream$ = new Subject<ToolEvent<unknown>>();

  /**
   * Mapa de streams por toolKey (namespacing)
   */
  private readonly toolStreams = new Map<string, Subject<ToolEvent>>();
  
  /**
   * Emite um evento no sistema
   * 
   * @param event Evento a ser emitido
   * @throws Error se o payload contiver dados sensíveis
   */
  emit(event: ToolEvent): void {
    // Validar payload
    if (event.data && !validateSafePayload(event.data)) {
      throw new Error('[ToolEvents] Payload contém dados sensíveis');
    }
    
    // Emitir no stream global
    this.globalStream$.next(event);
    
    // Emitir no stream específico da tool
    const toolStream = this.getOrCreateToolStream(event.toolKey);
    toolStream.next(event);
  }
  
  /**
   * Escuta eventos com base em filtros ou predicado
   * 
   * @param filterOrPredicate Filtro ou predicado customizado
   * @returns Observable de eventos filtrados
   */
  on<T = unknown>(
    filterOrPredicate?: ToolEventFilter | ToolEventPredicate<T>
  ): Observable<ToolEvent<T>> {
    const stream$ = this.globalStream$.asObservable();
    
    if (!filterOrPredicate) {
      // cast to the requested generic to satisfy callers
      return stream$ as Observable<ToolEvent<T>>;
    }
    
    // Predicado customizado
    if (typeof filterOrPredicate === 'function') {
      return stream$.pipe(
        filter(filterOrPredicate as ToolEventPredicate)
      ) as Observable<ToolEvent<T>>;
    }
    
    // Filtro estruturado
    return stream$.pipe(
      filter(event => this.matchesFilter(event, filterOrPredicate))
    ) as Observable<ToolEvent<T>>;
  }
  
  /**
   * Escuta eventos de uma tool específica
   * 
   * @param toolKey Identificador da tool
   * @param typeFilter Tipo de evento opcional
   * @returns Observable de eventos da tool
   */
  onTool<T = unknown>(
    toolKey: string,
    typeFilter?: ToolEventType | string
  ): Observable<ToolEvent<T>> {
    const toolStream$ = this.getOrCreateToolStream(toolKey).asObservable();
    
    if (!typeFilter) {
      return toolStream$ as Observable<ToolEvent<T>>;
    }
    
    return toolStream$.pipe(
      filter(event => event.type === typeFilter)
    ) as Observable<ToolEvent<T>>;
  }
  
  /**
   * Helper: emite evento LOADED
   */
  emitLoaded(toolKey: string, data?: unknown): void {
    const event = createToolEvent(toolKey, ToolEventType.LOADED, {
      data,
      severity: ToolEventSeverity.INFO,
      message: `Tool ${toolKey} carregada`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento READY
   */
  emitReady(toolKey: string, data?: unknown): void {
    const event = createToolEvent(toolKey, ToolEventType.READY, {
      data,
      severity: ToolEventSeverity.INFO,
      message: `Tool ${toolKey} pronta`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento ERROR
   */
  emitError(
    toolKey: string,
    error: Error | string,
    data?: unknown
  ): void {
    const message = typeof error === 'string' ? error : error.message;
    // Ensure we only spread when data is an object to avoid TS errors
    const baseData: Record<string, unknown> =
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
    const payload = {
      ...baseData,
      errorMessage: message,
      errorName: typeof error === 'object' ? (error as Error).name : 'Error',
    };

    const event = createToolEvent(toolKey, ToolEventType.ERROR, {
      data: payload,
      severity: ToolEventSeverity.ERROR,
      message: `Erro na tool ${toolKey}: ${message}`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento CONTEXT_CHANGED
   */
  emitContextChanged(
    toolKey: string,
    context: ToolEvent['context'],
    data?: unknown
  ): void {
    const event = createToolEvent(toolKey, ToolEventType.CONTEXT_CHANGED, {
      data,
      context,
      severity: ToolEventSeverity.INFO,
      message: `Contexto alterado na tool ${toolKey}`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento UNLOADED
   */
  emitUnloaded(toolKey: string, data?: unknown): void {
    const event = createToolEvent(toolKey, ToolEventType.UNLOADED, {
      data,
      severity: ToolEventSeverity.INFO,
      message: `Tool ${toolKey} descarregada`,
    });
    this.emit(event);
  }
  
  // =========================================================================
  // Telemetry Events (obrigatórios para observabilidade)
  // =========================================================================
  
  /**
   * Helper: emite evento de início de carregamento da tool
   */
  emitToolLoadStart(toolKey: string): void {
    const event = createToolEvent(toolKey, ToolEventType.TOOL_LOAD_START, {
      data: { toolKey, startTime: Date.now() },
      severity: ToolEventSeverity.INFO,
      message: `Iniciando carregamento da tool ${toolKey}`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento de tool carregada com sucesso
   */
  emitToolLoadSuccess(metadata: ToolLoadedMetadata): void {
    const event = createToolEvent(metadata.toolKey, ToolEventType.TOOL_LOAD_SUCCESS, {
      data: metadata,
      severity: ToolEventSeverity.INFO,
      message: `Tool ${metadata.toolKey} carregada em ${metadata.loadTime}ms`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento de falha no carregamento da tool
   */
  emitToolLoadFailed(metadata: ToolFailedMetadata): void {
    const event = createToolEvent(metadata.toolKey, ToolEventType.TOOL_LOAD_FAILED, {
      data: metadata,
      severity: ToolEventSeverity.ERROR,
      message: `Falha ao carregar tool ${metadata.toolKey}: ${metadata.reason}`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite evento de uso de feature
   */
  emitFeatureUsed(metadata: FeatureUsedMetadata): void {
    const event = createToolEvent(metadata.toolKey, ToolEventType.FEATURE_USED, {
      data: metadata,
      context: metadata.context,
      severity: ToolEventSeverity.INFO,
      message: `Feature ${metadata.featureName} usada na tool ${metadata.toolKey}`,
    });
    this.emit(event);
  }
  
  /**
   * Helper: emite marcador de performance
   */
  emitPerformanceMarker(toolKey: string, metadata: PerformanceMarkerMetadata): void {
    const event = createToolEvent(toolKey, ToolEventType.PERFORMANCE_MARKER, {
      data: metadata,
      severity: ToolEventSeverity.INFO,
      message: `Performance: ${metadata.action} completou em ${metadata.duration}ms`,
    });
    this.emit(event);
  }
  
  /**
   * Obtém ou cria stream específico de uma tool
   */
  private getOrCreateToolStream(toolKey: string): Subject<ToolEvent> {
    if (!this.toolStreams.has(toolKey)) {
      this.toolStreams.set(toolKey, new Subject<ToolEvent>());
    }
    const stream = this.toolStreams.get(toolKey);
    if (!stream) {
      // fallback, should not occur but keeps TS happy
      const s = new Subject<ToolEvent>();
      this.toolStreams.set(toolKey, s);
      return s;
    }
    return stream;
  }
  
  /**
   * Verifica se evento corresponde ao filtro
   */
  private matchesFilter(event: ToolEvent, filter: ToolEventFilter): boolean {
    if (filter.toolKey && event.toolKey !== filter.toolKey) {
      return false;
    }
    
    if (filter.type && event.type !== filter.type) {
      return false;
    }
    
    if (filter.severity && event.severity !== filter.severity) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Limpa stream de uma tool específica (usado quando tool é descarregada)
   */
  clearToolStream(toolKey: string): void {
    const stream = this.toolStreams.get(toolKey);
    if (stream) {
      stream.complete();
      this.toolStreams.delete(toolKey);
    }
  }
  
  /**
   * Limpa todos os streams (usado em testes ou shutdown)
   */
  clearAllStreams(): void {
    this.toolStreams.forEach(stream => stream.complete());
    this.toolStreams.clear();
  }
}
