import { NotificationItem, NotificationLevel, NotificationSource, ToolNotificationEvent, NotificationAction } from './notification.model';
import { StandardError } from '@hub/error-model';

export function mapErrorToNotification(error: StandardError, correlationId?: string): NotificationItem {
  const level = mapErrorCategoryToLevel(error.category);
  return {
    id: correlationId ? `${error.code}:${correlationId}` : `${error.code}:${Date.now()}`,
    level,
    title: error.code as string,
    message: error.userMessage,
    source: NotificationSource.SYSTEM,
    timestamp: error.timestamp ?? new Date().toISOString(),
    read: false,
    archive: false,
    dedupeKey: `${error.code}:${error.correlationId ?? ''}`,
    correlationId: correlationId ?? error.correlationId,
    payload: error.detailsSafe,
  };
}

function mapErrorCategoryToLevel(category: unknown): NotificationLevel {
  switch (category) {
    case 'AUTH':
      return NotificationLevel.CRITICAL;
    case 'PERMISSION':
      return NotificationLevel.ERROR;
    case 'FLAGS':
      return NotificationLevel.WARNING;
    default:
      return NotificationLevel.ERROR;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isToolNotificationEvent(value: unknown): value is ToolNotificationEvent {
  if (!isRecord(value)) return false;
  const v = value as Record<string, unknown>;
  const hasType = !('type' in v) || typeof v['type'] === 'string';
  const hasTitle = !('title' in v) || typeof v['title'] === 'string';
  const hasMessage = !('message' in v) || typeof v['message'] === 'string';
  const hasTimestamp = !('timestamp' in v) || typeof v['timestamp'] === 'string';
  const hasLevel = !('level' in v) || typeof v['level'] === 'string';
  const hasId = !('id' in v) || typeof v['id'] === 'string';
  const hasDedupeKey = !('dedupeKey' in v) || typeof v['dedupeKey'] === 'string';
  const hasCorrelationId = !('correlationId' in v) || typeof v['correlationId'] === 'string';
  const hasPayload = !('payload' in v) || typeof v['payload'] === 'object' || v['payload'] === undefined;
  const hasAction = !('action' in v) || typeof v['action'] === 'object' || v['action'] === undefined;

  const hasAnyContent = typeof v['type'] === 'string' || typeof v['title'] === 'string' || typeof v['message'] === 'string';
  return hasAnyContent && hasType && hasTitle && hasMessage && hasTimestamp && hasLevel && hasId && hasDedupeKey && hasCorrelationId && hasPayload && hasAction;
}

// ToolEvent is domain-specific; accept any and map basic fields
export function mapToolEventToNotification(event: ToolNotificationEvent): NotificationItem {
  const dedupeKey = (event as any)?.['dedupeKey'] ?? `tool:${(event as any)?.['type']}:${(event as any)?.['id'] ?? Date.now()}`;
  const e = event as Record<string, unknown>;
  return {
    id: `tool:${e['id'] ?? Date.now()}`,
    level: (e['level'] as NotificationLevel) ?? NotificationLevel.INFO,
    title: String(e['title'] ?? e['type'] ?? 'Tool Event'),
    message: e['message'] as string | undefined,
    source: NotificationSource.TOOL,
    timestamp: (e['timestamp'] as string) ?? new Date().toISOString(),
    read: false,
    archive: false,
    dedupeKey,
    correlationId: e['correlationId'] as string | undefined,
    payload: e['payload'] as Record<string, unknown> | undefined,
    action: e['action'] as unknown as NotificationAction | undefined,
  };
}
