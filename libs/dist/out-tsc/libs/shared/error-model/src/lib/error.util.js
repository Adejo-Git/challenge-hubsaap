import { ErrorCode } from './error.model';
const SANITIZE_MAX_DEPTH = 4;
const SANITIZE_MAX_KEYS = 50;
const SANITIZE_MAX_ARRAY = 30;
function safeStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
export function sanitize(details) {
    if (details == null)
        return details;
    // Work on a shallow clone to avoid mutating original
    let copy;
    if (typeof details === 'string') {
        copy = details;
    }
    else if (typeof details === 'object') {
        copy = Array.isArray(details) ? [...details] : { ...details };
    }
    else {
        return details;
    }
    const stripSensitive = (obj, depth) => {
        if (!obj || typeof obj !== 'object')
            return obj;
        if (depth >= SANITIZE_MAX_DEPTH)
            return '[TRUNCATED_DEPTH]';
        if (Array.isArray(obj)) {
            return obj.slice(0, SANITIZE_MAX_ARRAY).map((entry) => stripSensitive(entry, depth + 1));
        }
        const input = obj;
        const out = {};
        const keys = Object.keys(input).slice(0, SANITIZE_MAX_KEYS);
        for (const k of keys) {
            const v = input[k];
            const key = String(k).toLowerCase();
            if (key.includes('authorization') ||
                key.includes('auth') ||
                key.includes('token') ||
                key.includes('password') ||
                key.includes('credential')) {
                out[k] = '[REDACTED]';
                continue;
            }
            if (typeof v === 'string') {
                // remove emails, CPF/CNPJ-like patterns
                let redacted = v.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[REDACTED_EMAIL]');
                redacted = redacted.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_CPF]');
                redacted = redacted.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[REDACTED_CNPJ]');
                // remove jwt-like tokens
                redacted = redacted.replace(/([A-Za-z0-9-_]+)\.([A-Za-z0-9-_]+)\.([A-Za-z0-9-_]+)/g, '[REDACTED_JWT]');
                // remove tokens in URLs
                redacted = redacted.replace(/(access_token=)[^&\s]+/gi, '$1[REDACTED]');
                out[k] = redacted;
            }
            else if (typeof v === 'object') {
                out[k] = stripSensitive(v, depth + 1);
            }
            else {
                out[k] = v;
            }
        }
        return out;
    };
    let sanitized = typeof copy === 'string' ? copy : stripSensitive(copy, 0);
    // Truncate large payloads > 1KB
    const asString = safeStringify(sanitized);
    if (asString.length > 1024) {
        const preview = asString.slice(0, 1024);
        if (typeof copy === 'string') {
            // keep string preview for original strings
            sanitized = preview + '...[TRUNCATED]';
        }
        else {
            // Return a stable object describing truncation to preserve predictable shape
            sanitized = {
                __truncated: true,
                preview,
            };
        }
    }
    return sanitized;
}
export function buildUserMessage(code) {
    // Minimal i18n fallback in pt-BR
    const map = {
        [ErrorCode.AUTH_EXPIRED]: 'Sua sessão expirou. Por favor, faça login novamente.',
        [ErrorCode.UNAUTHENTICATED]: 'Usuário não autenticado.',
        [ErrorCode.PERMISSION_DENIED]: 'Você não tem permissão para acessar este recurso.',
        [ErrorCode.NOT_FOUND]: 'Recurso não encontrado.',
        [ErrorCode.FLAG_DISABLED]: 'Recurso indisponível no momento.',
        [ErrorCode.HTTP_TIMEOUT]: 'A requisição expirou. Tente novamente.',
        [ErrorCode.HTTP_NETWORK_ERROR]: 'Erro de rede. Verifique sua conexão e tente novamente.',
        [ErrorCode.HTTP_SERVER_ERROR]: 'Erro no servidor. Tente novamente mais tarde.',
        [ErrorCode.VALIDATION_ERROR]: 'Dados inválidos. Verifique e tente novamente.',
        [ErrorCode.UNKNOWN_ERROR]: 'Ocorreu um erro desconhecido.',
    };
    return map[code] ?? String(code ?? 'Ocorreu um erro');
}
export function isRetryable(code) {
    switch (code) {
        case ErrorCode.HTTP_TIMEOUT:
        case ErrorCode.HTTP_NETWORK_ERROR:
            return true;
        case ErrorCode.AUTH_EXPIRED:
        case ErrorCode.PERMISSION_DENIED:
        case ErrorCode.NOT_FOUND:
            return false;
        default:
            return false;
    }
}
export function mapErrorCodeToHttpStatus(code) {
    switch (code) {
        case ErrorCode.AUTH_EXPIRED:
        case ErrorCode.UNAUTHENTICATED:
            return 401;
        case ErrorCode.PERMISSION_DENIED:
            return 403;
        case ErrorCode.NOT_FOUND:
            return 404;
        case ErrorCode.HTTP_TIMEOUT:
        case ErrorCode.HTTP_NETWORK_ERROR:
            return 408;
        case ErrorCode.HTTP_SERVER_ERROR:
            return 500;
        default:
            return 500;
    }
}
export function generateCorrelationId() {
    // simple UUID v4-ish generator without external deps
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export default {};
//# sourceMappingURL=error.util.js.map