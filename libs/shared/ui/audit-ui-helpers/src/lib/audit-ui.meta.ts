import { AuditMeta, BuildAuditMetaInput } from './audit-ui.model';
import { sanitizeMeta } from './audit-ui.util';

function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function buildAuditMeta(input: BuildAuditMetaInput): AuditMeta {
  const sanitizedExtra = sanitizeMeta(input.extra);

  return {
    ...sanitizedExtra,
    toolKey: input.toolKey,
    actionKey: input.actionKey,
    entityRef: input.entityRef,
    context: input.context,
    correlationId: input.correlationId || generateCorrelationId(),
  };
}
