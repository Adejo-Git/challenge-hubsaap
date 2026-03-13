// libs/shared/ui/ui-feedback/ui-feedback.spec.ts

import { mapErrorToMessage, defaultEmptyActions, feedbackVariants } from './ui-feedback.mappers';

describe('UiFeedback', () => {
    it('should map error to safe ui message', () => {
        const result = mapErrorToMessage({
            message: 'Erro genérico stack trace token=abcd cpf 123.456.789-09 user@email.com',
            correlationId: 'abc-123',
        });

        expect(result.title).toBeTruthy();
        expect(result.message).toContain('[redacted]');
        expect(result.message).not.toContain('stack trace');
        expect(result.message).not.toContain('user@email.com');
        expect(result.message).not.toContain('123.456.789-09');
        expect(result.correlationId).toBe('abc-123');
    });

    it('should fallback when error is undefined', () => {
        const result = mapErrorToMessage();

        expect(result.title).toBeTruthy();
        expect(result.message).toBeTruthy();
    });

    it('should expose helper defaults and feedback variants', () => {
        expect(feedbackVariants).toEqual(['info', 'success', 'warn', 'error', 'neutral']);

        const actions = defaultEmptyActions();
        expect(actions.length).toBeGreaterThan(0);
        expect(actions[0].handlerKey).toBe('refresh');
    });

    it('should trim and normalize correlation id', () => {
        const result = mapErrorToMessage({
            message: 'Erro',
            correlationId: '  corr-123  ',
        });

        expect(result.correlationId).toBe('corr-123');
    });

    it('should redact authorization and cnpj patterns', () => {
        const result = mapErrorToMessage({
            message: 'Authorization: Bearer abc.def.ghi cnpj 12.345.678/0001-99',
        });

        expect(result.message).toContain('[redacted]');
        expect(result.message).not.toContain('Bearer');
        expect(result.message).not.toContain('12.345.678/0001-99');
    });
});
