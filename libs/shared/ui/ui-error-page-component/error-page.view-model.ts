import { ErrorModel } from '../ui-feedback/ui-feedback.mappers';

export type ErrorPageType = 'auth' | 'permission' | 'not-found' | 'crash';

export interface ErrorPageDetails extends ErrorModel {
    status?: number;
    url?: string;
}

export interface ErrorPageAction {
    label: string;
    key: 'go-login' | 'request-access' | 'go-dashboard' | 'retry';
    navigateTo?: string;
}

export interface ErrorPageViewModel {
    title: string;
    message: string;
    icon: 'status.error';
    primaryCta: ErrorPageAction;
    secondaryCta?: ErrorPageAction;
    showCorrelationId: boolean;
    ariaLive: 'polite' | 'assertive';
}

const FALLBACK_MESSAGE = 'Não foi possível concluir a operação no momento.';

const DEFAULT_MESSAGE_BY_TYPE: Record<ErrorPageType, string> = {
    auth: 'Faça login novamente para continuar no Hub.',
    permission: 'Você não possui permissão para acessar este recurso no contexto atual.',
    'not-found': 'A rota informada não existe ou não está disponível neste contexto.',
    crash: 'Tente novamente em instantes. Se o problema persistir, acione o suporte com o Correlation ID.',
};

const TECHNICAL_PATTERNS: RegExp[] = [
    /\b(stack\s*trace|exception|traceback|sqlstate|select\s+.+\s+from)\b/gi,
    /\bpassword\b\s*[:=]\s*[^\s]+/gi,
    /\btoken\b\s*[:=]\s*[^\s]+/gi,
    /\bapi[-_ ]?key\b\s*[:=]\s*[^\s]+/gi,
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

export function resolveErrorPageViewModel(type: ErrorPageType, details?: ErrorPageDetails): ErrorPageViewModel {
    const safeMessage = details?.message ? sanitizeMessage(details.message) : DEFAULT_MESSAGE_BY_TYPE[type];
    const showCorrelationId = Boolean(details?.correlationId?.trim());

    switch (type) {
        case 'auth':
            return {
                title: 'Sua sessão expirou',
                message: safeMessage,
                icon: 'status.error',
                primaryCta: {
                    label: 'Ir para login',
                    key: 'go-login',
                    navigateTo: '/login',
                },
                secondaryCta: {
                    label: 'Voltar ao dashboard',
                    key: 'go-dashboard',
                    navigateTo: '/dashboard',
                },
                showCorrelationId,
                ariaLive: 'polite',
            };
        case 'permission':
            return {
                title: 'Acesso negado',
                message: safeMessage,
                icon: 'status.error',
                primaryCta: {
                    label: 'Solicitar acesso',
                    key: 'request-access',
                    navigateTo: '/access/request',
                },
                secondaryCta: {
                    label: 'Voltar ao dashboard',
                    key: 'go-dashboard',
                    navigateTo: '/dashboard',
                },
                showCorrelationId,
                ariaLive: 'polite',
            };
        case 'not-found':
            return {
                title: 'Página não encontrada',
                message: DEFAULT_MESSAGE_BY_TYPE['not-found'],
                icon: 'status.error',
                primaryCta: {
                    label: 'Voltar ao dashboard',
                    key: 'go-dashboard',
                    navigateTo: '/dashboard',
                },
                showCorrelationId,
                ariaLive: 'polite',
            };
        case 'crash':
        default:
            return {
                title: 'Ocorreu um erro crítico',
                message: safeMessage,
                icon: 'status.error',
                primaryCta: {
                    label: 'Tentar novamente',
                    key: 'retry',
                },
                secondaryCta: {
                    label: 'Voltar ao dashboard',
                    key: 'go-dashboard',
                    navigateTo: '/dashboard',
                },
                showCorrelationId,
                ariaLive: 'assertive',
            };
    }
}
