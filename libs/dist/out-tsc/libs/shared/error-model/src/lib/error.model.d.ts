export declare enum ErrorCategory {
    AUTH = "AUTH",
    PERMISSION = "PERMISSION",
    FLAGS = "FLAGS",
    HTTP = "HTTP",
    VALIDATION = "VALIDATION",
    UNKNOWN = "UNKNOWN"
}
export declare enum ErrorCode {
    AUTH_EXPIRED = "AUTH_EXPIRED",
    UNAUTHENTICATED = "UNAUTHENTICATED",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    NOT_FOUND = "NOT_FOUND",
    FLAG_DISABLED = "FLAG_DISABLED",
    HTTP_TIMEOUT = "HTTP_TIMEOUT",
    HTTP_NETWORK_ERROR = "HTTP_NETWORK_ERROR",
    HTTP_SERVER_ERROR = "HTTP_SERVER_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
export declare enum Severity {
    CRITICAL = "critical",
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
}
export type DenyReason = 'unauthenticated' | 'forbidden' | 'notFound' | 'flagOff' | 'contextMissing' | 'dependencyMissing' | string;
export type ErrorDetailsSafe = Record<string, unknown> | unknown[] | string | number | boolean | null;
export interface StandardError {
    category: ErrorCategory;
    code: ErrorCode | string;
    severity: Severity;
    userMessage: string;
    technicalMessage?: string;
    correlationId?: string;
    detailsSafe?: ErrorDetailsSafe;
    timestamp: string;
    source?: string;
}
declare const _default: {};
export default _default;
//# sourceMappingURL=error.model.d.ts.map