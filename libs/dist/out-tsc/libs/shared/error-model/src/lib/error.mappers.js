import { ErrorCategory, ErrorCode, Severity, } from './error.model';
import { sanitize, generateCorrelationId, buildUserMessage } from './error.util';
export function fromHttpError(response, correlationId) {
    const status = response?.status ?? 0;
    let code = ErrorCode.UNKNOWN_ERROR;
    let severity = Severity.ERROR;
    if (status === 0) {
        // network or CORS
        code = ErrorCode.HTTP_NETWORK_ERROR;
    }
    else if (status === 401) {
        code = ErrorCode.UNAUTHENTICATED;
        severity = Severity.CRITICAL;
    }
    else if (status === 403) {
        code = ErrorCode.PERMISSION_DENIED;
    }
    else if (status === 404) {
        code = ErrorCode.NOT_FOUND;
    }
    else if (status === 408 || status === 504) {
        code = ErrorCode.HTTP_TIMEOUT;
    }
    else if (status >= 500 && status < 600) {
        code = ErrorCode.HTTP_SERVER_ERROR;
    }
    else {
        // fallback: map 400 to validation
        if (status === 400) {
            code = ErrorCode.VALIDATION_ERROR;
        }
        else {
            code = ErrorCode.UNKNOWN_ERROR;
        }
    }
    const details = sanitize(response?.error ?? { message: response?.message, url: response?.url });
    return {
        category: ErrorCategory.HTTP,
        code,
        severity,
        userMessage: buildUserMessage(code),
        technicalMessage: typeof response?.error === 'string' ? response.error : undefined,
        correlationId: correlationId ?? generateCorrelationId(),
        detailsSafe: details,
        timestamp: new Date().toISOString(),
        source: response?.url,
    };
}
export function fromDenyReason(reason, correlationId) {
    let code = ErrorCode.PERMISSION_DENIED;
    let category = ErrorCategory.PERMISSION;
    let severity = Severity.ERROR;
    switch (String(reason)) {
        case 'unauthenticated':
            code = ErrorCode.UNAUTHENTICATED;
            category = ErrorCategory.AUTH;
            severity = Severity.CRITICAL;
            break;
        case 'forbidden':
            code = ErrorCode.PERMISSION_DENIED;
            category = ErrorCategory.PERMISSION;
            break;
        case 'notFound':
            code = ErrorCode.NOT_FOUND;
            category = ErrorCategory.HTTP;
            break;
        case 'flagOff':
            code = ErrorCode.FLAG_DISABLED;
            category = ErrorCategory.FLAGS;
            break;
        case 'contextMissing':
            code = ErrorCode.UNKNOWN_ERROR;
            category = ErrorCategory.UNKNOWN;
            break;
        case 'dependencyMissing':
            code = ErrorCode.UNKNOWN_ERROR;
            category = ErrorCategory.UNKNOWN;
            break;
        default:
            code = ErrorCode.PERMISSION_DENIED;
    }
    return {
        category,
        code,
        severity,
        userMessage: buildUserMessage(code),
        technicalMessage: String(reason),
        correlationId: correlationId ?? generateCorrelationId(),
        detailsSafe: null,
        timestamp: new Date().toISOString(),
    };
}
export function fromException(err, category, code, correlationId) {
    const message = err?.message ?? String(err ?? 'Error');
    const details = sanitize(err?.stack ? { stack: err.stack } : err);
    const resolvedCode = code ?? ErrorCode.UNKNOWN_ERROR;
    return {
        category: category ?? ErrorCategory.UNKNOWN,
        code: resolvedCode,
        severity: Severity.ERROR,
        userMessage: buildUserMessage(resolvedCode),
        technicalMessage: message,
        correlationId: correlationId ?? generateCorrelationId(),
        detailsSafe: details,
        timestamp: new Date().toISOString(),
    };
}
export default {};
//# sourceMappingURL=error.mappers.js.map