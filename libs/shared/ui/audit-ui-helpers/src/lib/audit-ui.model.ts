export type ActionKey =
  | 'approve'
  | 'publish'
  | 'status-change'
  | 'create'
  | 'update'
  | 'delete'
  | (string & {});

export interface ActorLite {
  id?: string;
  displayName?: string;
  roleKey?: string;
}

export interface EntityRef {
  type: string;
  id: string;
  label?: string;
}

export interface AuditContextSnapshot {
  tenantKey?: string;
  projectKey?: string;
  environmentKey?: string;
}

export interface AuditMeta {
  toolKey: string;
  actionKey: ActionKey;
  entityRef?: EntityRef;
  correlationId: string;
  context?: AuditContextSnapshot;
  [key: string]: unknown;
}

export interface AuditEvent {
  id?: string;
  timestamp: string;
  actionKey: ActionKey;
  type?: string;
  actorLite?: ActorLite;
  entityRef?: EntityRef;
  message?: string;
  meta?: Record<string, unknown>;
  source?: 'backend' | 'ui';
  status?: 'success' | 'info' | 'warning' | 'error';
}

export interface BuildAuditMetaInput {
  toolKey: string;
  actionKey: ActionKey;
  entityRef?: EntityRef;
  correlationId?: string;
  context?: AuditContextSnapshot;
  extra?: Record<string, unknown>;
}

export interface ToTimelineItemsOptions {
  toolKey: string;
  context?: AuditContextSnapshot;
  correlationId?: string;
  sortDirection?: 'asc' | 'desc';
  i18n?: (key: string, params?: Record<string, unknown>) => string | undefined;
  observability?: {
    track(eventName: string, metadata?: Record<string, unknown>): void;
    trackError?(error: unknown, metadata?: Record<string, unknown>): void;
  };
  onError?: (error: unknown) => void;
}
