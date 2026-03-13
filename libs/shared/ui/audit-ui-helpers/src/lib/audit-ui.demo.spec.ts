import { toTimelineItems } from './audit-ui.mapper';
import { AuditEvent } from './audit-ui.model';

describe('AuditUiHelpers Demo', () => {
  it('deve mapear AuditEvent para TimelineItem (evidência formal de demo)', () => {
    const events: AuditEvent[] = [
      {
        id: 'demo-1',
        timestamp: '2026-02-27T10:30:00.000Z',
        actionKey: 'approve',
        message: 'Solicitação aprovada na etapa de revisão',
        actorLite: { displayName: 'Revisor A' },
        entityRef: { type: 'request', id: 'REQ-100' },
        source: 'backend',
        meta: { stage: 'review', safeField: 'ok' },
      },
    ];

    const items = toTimelineItems(events, {
      toolKey: 'academy',
      correlationId: 'corr-demo-100',
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'demo-1',
      title: 'Aprovado por Revisor A',
      type: 'approve',
      meta: {
        toolKey: 'academy',
        actionKey: 'approve',
        correlationId: 'corr-demo-100',
      },
    });
  });
});
