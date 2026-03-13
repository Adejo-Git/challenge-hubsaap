export var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["AUTH"] = "AUTH";
    ErrorCategory["PERMISSION"] = "PERMISSION";
    ErrorCategory["FLAGS"] = "FLAGS";
    ErrorCategory["HTTP"] = "HTTP";
    ErrorCategory["VALIDATION"] = "VALIDATION";
    ErrorCategory["UNKNOWN"] = "UNKNOWN";
})(ErrorCategory || (ErrorCategory = {}));
export var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_EXPIRED"] = "AUTH_EXPIRED";
    ErrorCode["UNAUTHENTICATED"] = "UNAUTHENTICATED";
    ErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["FLAG_DISABLED"] = "FLAG_DISABLED";
    ErrorCode["HTTP_TIMEOUT"] = "HTTP_TIMEOUT";
    ErrorCode["HTTP_NETWORK_ERROR"] = "HTTP_NETWORK_ERROR";
    ErrorCode["HTTP_SERVER_ERROR"] = "HTTP_SERVER_ERROR";
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorCode || (ErrorCode = {}));
export var Severity;
(function (Severity) {
    Severity["CRITICAL"] = "critical";
    Severity["ERROR"] = "error";
    Severity["WARNING"] = "warning";
    Severity["INFO"] = "info";
})(Severity || (Severity = {}));
export default {};
//# sourceMappingURL=error.model.js.map