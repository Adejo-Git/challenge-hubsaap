/**
 * @file permission-rbac.errors.ts
 * @description Erros padronizados para o sistema RBAC.
 *
 * GUARDRAILS:
 * - Sem dados sensíveis (tokens, claims completas)
 * - Mensagens técnicas e minimalistas
 * - Integração com error-model do projeto
 */
import { StandardError } from '@hub/error-model';
/**
 * Erro: PermissionKey inválida (não passa na validação).
 */
export declare class InvalidPermissionKeyError extends Error {
    readonly key: string;
    readonly code = "INVALID_PERMISSION_KEY";
    constructor(key: string, message?: string);
}
/**
 * Erro: RoleKey inválida (não passa na validação).
 */
export declare class InvalidRoleKeyError extends Error {
    readonly key: string;
    readonly code = "INVALID_ROLE_KEY";
    constructor(key: string, message?: string);
}
/**
 * Erro: Configuração de RBAC inválida.
 */
export declare class InvalidRbacConfigError extends Error {
    readonly issues?: string[] | undefined;
    readonly code = "INVALID_RBAC_CONFIG";
    constructor(message: string, issues?: string[] | undefined);
}
/**
 * Erro: Estratégia RBAC não suportada.
 */
export declare class UnsupportedRbacStrategyError extends Error {
    readonly strategy: string;
    readonly code = "UNSUPPORTED_RBAC_STRATEGY";
    constructor(strategy: string, message?: string);
}
/**
 * Erro: Sessão não disponível ou inválida.
 */
export declare class NoSessionError extends Error {
    readonly code = "NO_SESSION";
    constructor(message?: string);
}
/**
 * Erro: PermissionMap inválido (ciclos, herança quebrada, etc.).
 */
export declare class InvalidPermissionMapError extends Error {
    readonly validationErrors?: string[] | undefined;
    readonly code = "INVALID_PERMISSION_MAP";
    constructor(message: string, validationErrors?: string[] | undefined);
}
/**
 * Helper: valida se um erro é do tipo RBAC Error.
 *
 * @param error Erro a checar
 * @returns true se for um erro RBAC conhecido
 */
export declare function isRbacError(error: unknown): boolean;
/**
 * Helper: extrai código técnico de um erro RBAC.
 *
 * @param error Erro a processar
 * @returns Código técnico ou 'UNKNOWN_ERROR'
 */
export declare function extractErrorCode(error: unknown): string;
/**
 * Helper: gera mensagem segura de erro (sem dados sensíveis).
 *
 * @param error Erro a processar
 * @returns Mensagem segura para log/explain
 */
export declare function safeErrorMessage(error: unknown): string;
/**
 * Mapper: converte erros RBAC para StandardError (integração error-model).
 *
 * @param error Erro RBAC a mapear
 * @param correlationId ID de correlação (opcional)
 * @returns StandardError compatível com error-model
 */
export declare function fromRbacError(error: unknown, correlationId?: string): StandardError;
//# sourceMappingURL=permission-rbac.errors.d.ts.map