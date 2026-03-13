// libs/shared/ui/ui-feedback/ui-feedback.mappers.ts

import { FeedbackAction, FeedbackVariant, UiMessage } from './ui-feedback.models';

/**
 * Contrato mínimo esperado de ErrorModel
 * (sem acoplamento a implementação específica)
 */
export interface ErrorModel {
    code?: string;
    message?: string;
    correlationId?: string;
}

export const feedbackVariants: FeedbackVariant[] = ['info', 'success', 'warn', 'error', 'neutral'];

const FALLBACK_MESSAGE = 'Não foi possível concluir a operação.';
const FALLBACK_TITLE = 'Ocorreu um erro';

const TECHNICAL_PATTERNS: RegExp[] = [
    /\b(stack\s*trace|exception|traceback|sqlstate|select\s+.+\s+from)\b/gi,
    /\bpassword\b\s*[:=]\s*[^\s]+/gi,
    /\btoken\b\s*[:=]\s*[^\s]+/gi,
    /\b(authorization|bearer)\b\s*[:=]?\s*[^\s]+/gi,
    /\bapi[-_ ]?key\b\s*[:=]\s*[^\s]+/gi,
    /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    /\b\d{11}\b/g,
    /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
    /\b\d{14}\b/g,
    /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
];

function sanitizeMessage(raw?: string): string {
    const normalized = raw?.trim();

    if (!normalized) {
        return FALLBACK_MESSAGE;
    }

    let safe = normalized;

    TECHNICAL_PATTERNS.forEach((pattern) => {
        safe = safe.replace(pattern, '[redacted]');
    });

    safe = safe.replace(/\s+/g, ' ').trim();

    return safe || FALLBACK_MESSAGE;
}

function normalizeCorrelationId(correlationId?: string): string | undefined {
    const trimmed = correlationId?.trim();
    return trimmed ? trimmed : undefined;
}

export function defaultEmptyActions(): FeedbackAction[] {
    return [
        { label: 'Atualizar', handlerKey: 'refresh', variant: 'neutral' },
        { label: 'Abrir ajuda', handlerKey: 'open-help', variant: 'info' },
    ];
}

/**
 * Mapeia ErrorModel para mensagem segura de UI
 * - Sem stacktrace
 * - Sem PII
 * - Com fallback previsível
 */
export function mapErrorToMessage(error?: ErrorModel): UiMessage {
    if (!error) {
        return {
            title: FALLBACK_TITLE,
            message: FALLBACK_MESSAGE,
        };
    }

    return {
        title: FALLBACK_TITLE,
        message: sanitizeMessage(error.message),
        correlationId: normalizeCorrelationId(error.correlationId),
    };
}
