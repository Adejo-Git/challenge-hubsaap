import { TimelineItem } from '@hub/patterns-timeline';

import { formatAuditLabel } from './audit-ui.labels';
import { buildAuditMeta } from './audit-ui.meta';
import { AuditEvent, ToTimelineItemsOptions } from './audit-ui.model';
import { buildAuditMappingError, safeIsoTimestamp, truncate } from './audit-ui.util';

function stableAuditId(event: AuditEvent, index: number): string {
  if (event.id) return event.id;
  const entityType = event.entityRef?.type || 'entity';
  const entityId = event.entityRef?.id || 'unknown';
  return `${entityType}:${entityId}:${event.actionKey}:${index}`;
}

function getSortValue(item: TimelineItem): number {
  const parsed = new Date(item.timestamp).valueOf();
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

export function toTimelineItems(events: AuditEvent[], options: ToTimelineItemsOptions): TimelineItem[] {
  const mapped: TimelineItem[] = [];

  for (const [index, event] of events.entries()) {
    try {
      const timestamp = safeIsoTimestamp(event.timestamp);
      const meta = buildAuditMeta({
        toolKey: options.toolKey,
        actionKey: event.actionKey,
        entityRef: event.entityRef,
        context: options.context,
        correlationId: options.correlationId,
        extra: event.meta,
      });

      mapped.push({
        id: stableAuditId(event, index),
        timestamp,
        title: formatAuditLabel(event, options.i18n),
        description: truncate(event.message, 240) || undefined,
        actor: event.actorLite?.displayName,
        type: event.type || String(event.actionKey),
        tags: [options.toolKey, event.source || 'ui'].filter(Boolean),
        meta,
      });
    } catch (error) {
      const standardError = buildAuditMappingError({
        correlationId: options.correlationId,
        technicalMessage: error instanceof Error ? error.message : String(error),
        detailsSafe: {
          index,
          toolKey: options.toolKey,
          actionKey: event?.actionKey,
        },
      });

      options.onError?.(standardError);
      options.observability?.track('audit.ui.mapping.error', {
        correlationId: standardError.correlationId,
        code: standardError.code,
      });
      options.observability?.trackError?.(standardError, {
        source: 'audit-ui-helpers',
      });
    }
  }

  options.observability?.track('audit.ui.mapping.completed', {
    totalInput: events.length,
    totalMapped: mapped.length,
    correlationId: options.correlationId,
    toolKey: options.toolKey,
  });

  const direction = options.sortDirection || 'desc';
  mapped.sort((left, right) => {
    const leftValue = getSortValue(left);
    const rightValue = getSortValue(right);
    return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
  });

  return mapped;
}
