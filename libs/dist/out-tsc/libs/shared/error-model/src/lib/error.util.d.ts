import { ErrorCode, ErrorDetailsSafe } from './error.model';
export declare function sanitize(details: unknown): ErrorDetailsSafe;
export declare function buildUserMessage(code: ErrorCode | string): string;
export declare function isRetryable(code: ErrorCode | string): boolean;
export declare function mapErrorCodeToHttpStatus(code: ErrorCode | string): number;
export declare function generateCorrelationId(): string;
declare const _default: {};
export default _default;
//# sourceMappingURL=error.util.d.ts.map