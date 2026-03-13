export enum NotificationLevel {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success',
}

export enum NotificationSource {
  SYSTEM = 'system',
  TOOL = 'tool',
  USER = 'user',
}

export type NotificationAction = {
  label: string;
  handler: string; // name of method to call in consumer or identifier
  refData?: unknown;
};

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  title: string;
  message?: string;
  source?: NotificationSource | string;
  timestamp: string; // ISO
  read?: boolean;
  archive?: boolean;
  dedupeKey?: string;
  correlationId?: string;
  action?: NotificationAction;
  payload?: unknown; // already sanitized
}

export type ToolNotificationEvent = {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  level?: NotificationLevel;
  timestamp?: string;
  payload?: unknown;
  dedupeKey?: string;
  correlationId?: string;
  action?: NotificationAction;
};

export type NotificationFilter = Partial<{
  level: NotificationLevel | NotificationLevel[];
  source: NotificationSource | NotificationSource[] | string;
  read: boolean;
}>;
