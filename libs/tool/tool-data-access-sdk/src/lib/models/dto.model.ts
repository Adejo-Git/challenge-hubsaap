/**
 * DTOs e contratos versionáveis
 * 
 * Contratos request/response padronizados.
 * Versionáveis por domínio da tool.
 * 
 * Responsabilidades:
 * - Definir tipos de request/response
 * - Garantir versionamento claro (ex: v1, v2)
 * - Manter imutabilidade (readonly quando aplicável)
 * 
 * Não-responsabilidades:
 * - Lógica de negócio
 * - Validações complexas (somente estrutura)
 */

// Exemplo: Workspace DTOs
export interface WorkspaceDto {
  readonly id: string;
  readonly name: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWorkspaceRequest {
  readonly name: string;
  readonly tenantId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateWorkspaceRequest {
  readonly name?: string;
  readonly metadata?: Record<string, unknown>;
}

// Exemplo: Evidence DTOs
export interface EvidenceDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly type: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface CreateEvidenceRequest {
  readonly workspaceId: string;
  readonly type: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

// Paginação padronizada
export interface PaginatedResponse<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface PaginationParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
}
