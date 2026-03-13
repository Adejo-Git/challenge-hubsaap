// libs/shared/ui/ui-feedback/ui-feedback.models.ts

/**
 * Estados padronizados de UX
 */
export type FeedbackState =
    | 'loading'
    | 'empty'
    | 'error'
    | 'denied'
    | 'success';

/**
 * Variantes visuais baseadas em tokens
 */
export type FeedbackVariant =
    | 'info'
    | 'success'
    | 'warn'
    | 'error'
    | 'neutral';

/**
 * Ação exposta pelo componente (sem lógica)
 */
export interface FeedbackAction {
    label: string;
    icon?: string;
    handlerKey: string;
    variant?: FeedbackVariant;
}

/**
 * Mensagem segura para UI (derivada ou direta)
 */
export interface UiMessage {
    title: string;
    message?: string;
    detailsSafe?: string;
    correlationId?: string;
}
