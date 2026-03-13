import { AuditEvent } from './audit-ui.model';
import { safeString } from './audit-ui.util';

const ACTION_LABELS: Record<string, string> = {
  approve: 'Aprovado',
  publish: 'Publicado',
  'status-change': 'Status alterado',
  create: 'Criado',
  update: 'Atualizado',
  delete: 'Removido',
};

function titleFromActionKey(actionKey: string): string {
  const normalized = actionKey.replace(/[-_]+/g, ' ').trim();
  if (!normalized) return 'Ação registrada';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatAuditLabel(
  event: Pick<AuditEvent, 'actionKey' | 'actorLite' | 'entityRef'>,
  i18n?: (key: string, params?: Record<string, unknown>) => string | undefined,
): string {
  const i18nLabel = i18n?.(`audit.action.${event.actionKey}`, {
    actionKey: event.actionKey,
    actor: event.actorLite?.displayName,
    entityType: event.entityRef?.type,
  });

  const actionLabel =
    safeString(i18nLabel) || ACTION_LABELS[event.actionKey] || titleFromActionKey(event.actionKey);
  const actor = safeString(event.actorLite?.displayName);

  if (actor) {
    return `${actionLabel} por ${actor}`;
  }

  return actionLabel;
}
