import { formatAuditLabel } from './audit-ui.labels';
import { buildAuditMeta } from './audit-ui.meta';
import { AuditEvent } from './audit-ui.model';
import { toTimelineItems } from './audit-ui.mapper';
import { buildAuditMappingError } from './audit-ui.util';

describe('audit-ui-helpers', () => {
  describe('toTimelineItems', () => {
    it('mapeia AuditEvent[] para TimelineItem[] de forma consistente e ordenada', () => {
      const events: AuditEvent[] = [
        {
          id: 'a-1',
          timestamp: '2026-01-01T10:00:00.000Z',
          actionKey: 'publish',
          actorLite: { displayName: 'Ana' },
          message: 'Publicação concluída',
          source: 'backend',
          entityRef: { type: 'post', id: '10' },
        },
        {
          id: 'a-2',
          timestamp: '2026-01-01T12:00:00.000Z',
          actionKey: 'approve',
          actorLite: { displayName: 'Bruno' },
          message: 'Aprovação registrada',
          source: 'ui',
          entityRef: { type: 'post', id: '10' },
        },
      ];

      const items = toTimelineItems(events, {
        toolKey: 'academy',
        correlationId: 'corr-001',
      });

      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('a-2');
      expect(items[0].title).toBe('Aprovado por Bruno');
      expect(items[0].meta).toMatchObject({
        toolKey: 'academy',
        actionKey: 'approve',
        correlationId: 'corr-001',
      });
    });
  });

  describe('formatAuditLabel', () => {
    it('usa fallback quando i18n não existe', () => {
      const label = formatAuditLabel({
        actionKey: 'status-change',
        actorLite: { displayName: 'Carla' },
      });

      expect(label).toBe('Status alterado por Carla');
    });

    it('não quebra quando actionKey é desconhecido', () => {
      const label = formatAuditLabel({
        actionKey: 'custom-action-key',
      });

      expect(label).toBe('Custom action key');
    });
  });

  describe('buildAuditMeta', () => {
    it('sanitiza metadados sensíveis e mantém correlationId', () => {
      const meta = buildAuditMeta({
        toolKey: 'techlab',
        actionKey: 'approve',
        correlationId: 'corr-123',
        extra: {
          authorization: 'Bearer abc',
          nested: {
            email: 'user@example.com',
          },
          safe: 'ok',
        },
      });

      expect(meta.correlationId).toBe('corr-123');
      expect(meta.authorization).toBe('[REDACTED]');
      expect(meta.nested).toMatchObject({ email: '[REDACTED]' });
      expect(meta.safe).toBe('ok');
    });
  });

  describe('observability e error-model', () => {
    it('reporta conclusão de mapeamento por observability quando disponível', () => {
      const track = jest.fn();
      const events: AuditEvent[] = [
        {
          id: 'a-10',
          timestamp: '2026-01-01T12:00:00.000Z',
          actionKey: 'approve',
        },
      ];

      toTimelineItems(events, {
        toolKey: 'academy',
        observability: { track },
        correlationId: 'corr-track',
      });

      expect(track).toHaveBeenCalledWith('audit.ui.mapping.completed', {
        totalInput: 1,
        totalMapped: 1,
        correlationId: 'corr-track',
        toolKey: 'academy',
      });
    });

    it('normaliza erro de mapeamento com contrato do error-model', () => {
      const standard = buildAuditMappingError({
        correlationId: 'corr-err',
        technicalMessage: 'falha x',
        detailsSafe: { authorization: 'secret' },
      });

      expect(standard.code).toBe('UNKNOWN_ERROR');
      expect(standard.correlationId).toBe('corr-err');
      expect(standard.detailsSafe).toMatchObject({ authorization: '[REDACTED]' });
    });
  });
});
