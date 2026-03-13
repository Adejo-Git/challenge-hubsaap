import { evidenceHints } from './audit-ui.evidence';
import { toTimelineItems } from './audit-ui.mapper';
import { AuditEvent } from './audit-ui.model';

describe('audit-ui-helpers integration', () => {
  it('integra mapeamento completo com contexto, i18n e meta sanitizada', () => {
    const events: AuditEvent[] = [
      {
        id: 'evt-2',
        timestamp: '2026-02-20T12:00:00.000Z',
        actionKey: 'status-change',
        actorLite: { displayName: 'Maria' },
        entityRef: { type: 'order', id: '001' },
        meta: {
          authorization: 'Bearer token',
          nested: { email: 'maria@corp.com' },
          safe: 'ok',
        },
      },
      {
        id: 'evt-1',
        timestamp: '2026-02-20T10:00:00.000Z',
        actionKey: 'approve',
        actorLite: { displayName: 'João' },
        entityRef: { type: 'order', id: '001' },
      },
    ];

    const items = toTimelineItems(events, {
      toolKey: 'academy',
      sortDirection: 'asc',
      correlationId: 'corr-int-001',
      context: {
        tenantKey: 'tenant-a',
        projectKey: 'project-x',
        environmentKey: 'dev',
      },
      i18n: (key) => (key === 'audit.action.approve' ? 'Aprovação' : undefined),
    });

    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('evt-1');
    expect(items[0].title).toBe('Aprovação por João');
    expect(items[1].meta).toMatchObject({
      correlationId: 'corr-int-001',
      context: {
        tenantKey: 'tenant-a',
        projectKey: 'project-x',
        environmentKey: 'dev',
      },
      authorization: '[REDACTED]',
      nested: { email: '[REDACTED]' },
      safe: 'ok',
    });
  });

  it('mantém determinismo quando há evento malformado: reporta erro e continua o lote', () => {
    const track = jest.fn();
    const trackError = jest.fn();
    const onError = jest.fn();

    const validEvent: AuditEvent = {
      id: 'ok-1',
      timestamp: '2026-02-20T10:00:00.000Z',
      actionKey: 'publish',
      actorLite: { displayName: 'Operador' },
    };

    const malformedEvent = {
      id: 'bad-1',
      timestamp: '2026-02-20T11:00:00.000Z',
      actionKey: { invalid: true },
    } as unknown as AuditEvent;

    const items = toTimelineItems([validEvent, malformedEvent], {
      toolKey: 'techlab',
      correlationId: 'corr-int-err',
      observability: { track, trackError },
      onError,
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('ok-1');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('audit.ui.mapping.error', {
      correlationId: 'corr-int-err',
      code: 'UNKNOWN_ERROR',
    });
    expect(trackError).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith('audit.ui.mapping.completed', {
      totalInput: 2,
      totalMapped: 1,
      correlationId: 'corr-int-err',
      toolKey: 'techlab',
    });
  });

  it('retorna hint de evidência conhecido e fallback para action desconhecida', () => {
    const approveHint = evidenceHints('approve');
    const fallbackHint = evidenceHints('unknown-action-key');

    expect(approveHint.actionKey).toBe('approve');
    expect(approveHint.suggestedArtifacts.length).toBeGreaterThan(0);
    expect(fallbackHint.actionKey).toBe('unknown-action-key');
    expect(fallbackHint.checklist.length).toBeGreaterThan(0);
  });
});
