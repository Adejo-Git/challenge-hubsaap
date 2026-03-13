/**
 * Tool Events Model
 * 
 * Define os tipos, interfaces e enums para o sistema de eventos entre Tool e Hub.
 * Garante payload seguro (sem dados sensíveis) e padronização dos eventos.
 */

/**
 * Tipos de eventos suportados
 * - Lifecycle: eventos do ciclo de vida da tool
 * - Telemetry: eventos de telemetria obrigatórios
 * - Custom: eventos específicos de domínio da tool
 */
export enum ToolEventType {
  // Lifecycle events
  LOADED = 'tool.lifecycle.loaded',
  READY = 'tool.lifecycle.ready',
  ERROR = 'tool.lifecycle.error',
  CONTEXT_CHANGED = 'tool.lifecycle.contextChanged',
  UNLOADED = 'tool.lifecycle.unloaded',
  
  // Telemetry events (obrigatórios para observabilidade)
  TOOL_LOAD_START = 'tool.telemetry.loadStart',
  TOOL_LOAD_SUCCESS = 'tool.telemetry.loadSuccess',
  TOOL_LOAD_FAILED = 'tool.telemetry.loadFailed',
  FEATURE_USED = 'tool.telemetry.featureUsed',
  PERFORMANCE_MARKER = 'tool.telemetry.performanceMarker',
  
  // Custom events (base para extensão)
  CUSTOM = 'tool.custom',
}

/**
 * Severidade do evento
 */
export enum ToolEventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Metadata para evento de carregamento de tool
 */
export interface ToolLoadedMetadata {
  toolKey: string;
  loadTime: number;
  success: boolean;
  error?: string;
}

/**
 * Metadata para evento de falha de tool
 */
export interface ToolFailedMetadata {
  toolKey: string;
  stage: 'registration' | 'routing' | 'render' | 'initialization';
  reason: string;
  error?: Error;
}

/**
 * Metadata para evento de uso de feature
 */
export interface FeatureUsedMetadata {
  toolKey: string;
  featureName: string;
  context?: {
    tenantId?: string;
    clientId?: string;
    projectId?: string;
  };
}

/**
 * Metadata para marcador de performance
 */
export interface PerformanceMarkerMetadata {
  action: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface de eventos de telemetria obrigatórios
 * Garante observabilidade mínima para todas as tools
 */
export interface ToolTelemetryEvents {
  /**
   * Evento de tool carregada com sucesso
   */
  onToolLoaded: (metadata: ToolLoadedMetadata) => void;
  
  /**
   * Evento de falha no carregamento/execução da tool
   */
  onToolFailed: (metadata: ToolFailedMetadata) => void;
  
  /**
   * Evento de uso de feature da tool
   */
  onFeatureUsed: (metadata: FeatureUsedMetadata) => void;
  
  /**
   * Evento de performance (timing, duração de operações)
   */
  onPerformanceMarker: (metadata: PerformanceMarkerMetadata) => void;
}

/**
 * Campos proibidos no payload (prevenção de dados sensíveis)
 */
const FORBIDDEN_PAYLOAD_KEYS = [
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'secret',
  'apiKey',
  'privateKey',
  'ssn',
  'cpf',
  'creditCard',
  'cvv',
] as const;

// Precompute a lowercase set for robust, case-insensitive checks
const FORBIDDEN_PAYLOAD_KEY_SET = new Set<string>(
  FORBIDDEN_PAYLOAD_KEYS.map((k) => k.toLowerCase())
);

/**
 * Tipo utilitário para validar que o payload não contém chaves proibidas
 */
export type SafePayload<T = Record<string, unknown>> = T extends Record<string, unknown>
  ? Exclude<keyof T, typeof FORBIDDEN_PAYLOAD_KEYS[number]> extends keyof T
    ? T
    : never
  : T;

/**
 * Interface principal do evento
 */
export interface ToolEvent<TData = unknown> {
  /**
   * Tipo do evento (lifecycle ou custom)
   */
  type: ToolEventType | string;
  
  /**
   * Identificador da tool (namespace)
   */
  toolKey: string;
  
  /**
   * Timestamp de emissão (ISO 8601)
   */
  timestamp: string;
  
  /**
   * ID de correlação para rastreamento
   */
  correlationId: string;
  
  /**
   * Severidade do evento
   */
  severity: ToolEventSeverity;
  
  /**
   * Payload de dados (deve ser safe by design)
   */
  data?: TData;
  
  /**
   * Mensagem descritiva (opcional)
   */
  message?: string;
  
  /**
   * Contexto reduzido (apenas IDs, não objetos complexos)
   */
  context?: {
    tenantId?: string;
    clientId?: string;
    projectId?: string;
    userId?: string;
  };
}

/**
 * Filtro de eventos (usado no método on() do service)
 */
export interface ToolEventFilter {
  toolKey?: string;
  type?: ToolEventType | string;
  severity?: ToolEventSeverity;
}

/**
 * Predicado customizado para filtro avançado
 */
export type ToolEventPredicate<T = unknown> = (event: ToolEvent<T>) => boolean;

/**
 * Validador de payload seguro
 * Bloqueia payloads que contenham chaves proibidas
 */
export function validateSafePayload<T>(payload: T): boolean {
  if (!payload || typeof payload !== 'object') {
    return true;
  }
  
  const keys = Object.keys(payload);
  const hasForbiddenKey = keys.some((key) =>
    FORBIDDEN_PAYLOAD_KEY_SET.has(key.toLowerCase())
  );
  
  if (hasForbiddenKey) {
    console.error('[ToolEvents] Payload contém dados sensíveis proibidos:', keys);
    return false;
  }
  
  return true;
}

/**
 * Gerador de correlationId (UUID v4 simplificado)
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Factory para criar eventos padronizados
 */
export function createToolEvent<T = unknown>(
  toolKey: string,
  type: ToolEventType | string,
  options: {
    data?: T;
    message?: string;
    severity?: ToolEventSeverity;
    correlationId?: string;
    context?: ToolEvent['context'];
  } = {}
): ToolEvent<T> {
  const {
    data,
    message,
    severity = ToolEventSeverity.INFO,
    correlationId = generateCorrelationId(),
    context,
  } = options;
  
  // Validar payload
  if (data && !validateSafePayload(data)) {
    throw new Error('[ToolEvents] Payload contém dados sensíveis');
  }
  
  return {
    type,
    toolKey,
    timestamp: new Date().toISOString(),
    correlationId,
    severity,
    data,
    message,
    context,
  };
}
