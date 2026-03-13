import { ErrorCategory, ErrorCode, StandardError, DenyReason } from './error.model';
interface HttpErrorLike {
    status: number;
    error?: unknown;
    message?: string;
    url?: string;
}
export declare function fromHttpError(response: HttpErrorLike, correlationId?: string): StandardError;
export declare function fromDenyReason(reason: DenyReason, correlationId?: string): StandardError;
export declare function fromException(err: unknown, category?: ErrorCategory, code?: ErrorCode | string, correlationId?: string): StandardError;
declare const _default: {};
export default _default;
//# sourceMappingURL=error.mappers.d.ts.map