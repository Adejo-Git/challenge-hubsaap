/**
 * Tool Events Bridge
 * 
 * Adapters opcionais para integração com Shared Libs do Hub:
 * - ObservabilityService: logar eventos com correlação
 * - NotificationService: converter eventos em notificações UX
 * 
 * Desacoplado via injeção de dependência (opcional).
 */

import { Injectable, Optional, Inject } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  ToolEvent,
  ToolEventType,
  ToolEventSeverity,
} from './tool-events.model';
import { ToolEventsService } from './tool-events.service';

/**
 * Interface mínima para ObservabilityService (evita acoplamento direto)
 */
export interface IObservabilityService {
  logEvent(event: {
    name: string;
    properties?: Record<string, unknown>;
    correlationId?: string;
    severity?: string;
  }): void;
}

/**
 * Interface mínima para NotificationService (evita acoplamento direto)
 */
export interface INotificationService {
  notify(notification: {
    title: string;
    message?: string;
    severity?: 'info' | 'warning' | 'error' | 'success';
    metadata?: Record<string, unknown>;
  }): void;
}

/**
 * Tokens de injeção (permite provedores opcionais)
 */
export const OBSERVABILITY_SERVICE = 'OBSERVABILITY_SERVICE';
export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';

/**
 * Bridge para conectar ToolEvents com serviços do Hub
 */
@Injectable({
  providedIn: 'root',
})
export class ToolEventsBridge {
  private subscriptions: Subscription[] = [];
  
  constructor(
    private readonly toolEvents: ToolEventsService,
    @Optional() @Inject(OBSERVABILITY_SERVICE) private readonly observability?: IObservabilityService,
    @Optional() @Inject(NOTIFICATION_SERVICE) private readonly notification?: INotificationService
  ) {}
  
  /**
   * Ativa bridge para observabilidade
   * Todos os eventos serão logados automaticamente
   */
  enableObservabilityBridge(): void {
    if (!this.observability) {
      console.warn('[ToolEventsBridge] ObservabilityService não disponível');
      return;
    }
    
    const sub = this.toolEvents.on().subscribe(event => {
      this.logEventToObservability(event);
    });
    
    this.subscriptions.push(sub);
  }
  
  /**
   * Ativa bridge para notificações
   * Eventos específicos serão convertidos em notificações UX
   */
  enableNotificationBridge(options?: {
    /**
     * Tipos de eventos que devem gerar notificação
     * Default: apenas ERROR e CRITICAL
     */
    eventTypes?: (ToolEventType | string)[];
    
    /**
     * Severidades mínimas que devem gerar notificação
     * Default: WARNING, ERROR, CRITICAL
     */
    minSeverity?: ToolEventSeverity;
  }): void {
    if (!this.notification) {
      console.warn('[ToolEventsBridge] NotificationService não disponível');
      return;
    }
    
    const eventTypes = options?.eventTypes || [ToolEventType.ERROR];
    const minSeverity = options?.minSeverity || ToolEventSeverity.WARNING;
    
    const sub = this.toolEvents.on(event => {
      // Filtrar por tipo
      const matchesType = eventTypes.includes(event.type);
      
      // Filtrar por severidade
      const severityLevel = this.getSeverityLevel(event.severity);
      const minSeverityLevel = this.getSeverityLevel(minSeverity);
      const matchesSeverity = severityLevel >= minSeverityLevel;
      
      return matchesType || matchesSeverity;
    }).subscribe(event => {
      this.notifyEvent(event);
    });
    
    this.subscriptions.push(sub);
  }
  
  /**
   * Ativa ambas as bridges
   */
  enableAll(notificationOptions?: Parameters<typeof this.enableNotificationBridge>[0]): void {
    this.enableObservabilityBridge();
    this.enableNotificationBridge(notificationOptions);
  }
  
  /**
   * Desativa todas as bridges
   */
  disable(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
  
  /**
   * Loga evento no serviço de observabilidade
   */
  private logEventToObservability(event: ToolEvent): void {
    if (!this.observability) return;
    
    this.observability.logEvent({
      name: `ToolEvent.${event.type}`,
      properties: {
        toolKey: event.toolKey,
        severity: event.severity,
        message: event.message,
        data: event.data,
        context: event.context,
      },
      correlationId: event.correlationId,
      severity: event.severity,
    });
  }
  
  /**
   * Converte evento em notificação UX
   */
  private notifyEvent(event: ToolEvent): void {
    if (!this.notification) return;
    
    const title = this.getNotificationTitle(event);
    const message = event.message || this.getDefaultMessage(event);
    const severity = this.mapSeverityToNotification(event.severity);
    
    this.notification.notify({
      title,
      message,
      severity,
      metadata: {
        toolKey: event.toolKey,
        eventType: event.type,
        correlationId: event.correlationId,
      },
    });
  }
  
  /**
   * Gera título da notificação baseado no evento
   */
  private getNotificationTitle(event: ToolEvent): string {
    switch (event.type) {
      case ToolEventType.ERROR:
        return `Erro na ${event.toolKey}`;
      case ToolEventType.READY:
        return `${event.toolKey} pronta`;
      case ToolEventType.LOADED:
        return `${event.toolKey} carregada`;
      default:
        return `Evento: ${event.toolKey}`;
    }
  }
  
  /**
   * Gera mensagem padrão caso não venha no evento
   */
  private getDefaultMessage(event: ToolEvent): string {
    return `Evento ${event.type} na tool ${event.toolKey}`;
  }
  
  /**
   * Mapeia severidade de evento para severidade de notificação
   */
  private mapSeverityToNotification(
    severity: ToolEventSeverity
  ): 'info' | 'warning' | 'error' | 'success' {
    switch (severity) {
      case ToolEventSeverity.INFO:
        return 'info';
      case ToolEventSeverity.WARNING:
        return 'warning';
      case ToolEventSeverity.ERROR:
      case ToolEventSeverity.CRITICAL:
        return 'error';
      default:
        return 'info';
    }
  }
  
  /**
   * Converte severidade em nível numérico para comparação
   */
  private getSeverityLevel(severity: ToolEventSeverity): number {
    switch (severity) {
      case ToolEventSeverity.INFO:
        return 0;
      case ToolEventSeverity.WARNING:
        return 1;
      case ToolEventSeverity.ERROR:
        return 2;
      case ToolEventSeverity.CRITICAL:
        return 3;
      default:
        return 0;
    }
  }
}
