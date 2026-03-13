/**
 * Workspace Client
 * 
 * Client tipado para operações de Workspace.
 * Exemplo de client específico estendendo BaseClient.
 * 
 * Responsabilidades:
 * - Prover métodos tipados para Workspace (GET, POST, PUT, DELETE)
 * - Encapsular paths e DTOs específicos de Workspace
 * - Retornar Observables tipados
 * 
 * Não-responsabilidades:
 * - Implementar lógica de negócio/validação (isso é service/store da tool)
 * - Decidir UX/UI (isso é componente)
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseClient } from './base.client';
import {
  CreateWorkspaceRequest,
  PaginatedResponse,
  PaginationParams,
  UpdateWorkspaceRequest,
  WorkspaceDto,
} from '../models/dto.model';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceClient extends BaseClient {
  /**
   * Busca workspace por ID
   */
  getWorkspace(workspaceId: string): Observable<WorkspaceDto> {
    return this.get<WorkspaceDto>(`/workspaces/${workspaceId}`);
  }

  /**
   * Lista workspaces com paginação
   */
  listWorkspaces(params?: PaginationParams): Observable<PaginatedResponse<WorkspaceDto>> {
    const queryParams = params ? { params: params as Record<string, string | number> } : undefined;
    return this.get<PaginatedResponse<WorkspaceDto>>('/workspaces', queryParams);
  }

  /**
   * Cria novo workspace
   */
  createWorkspace(request: CreateWorkspaceRequest): Observable<WorkspaceDto> {
    return this.post<WorkspaceDto>('/workspaces', request);
  }

  /**
   * Atualiza workspace existente
   */
  updateWorkspace(workspaceId: string, request: UpdateWorkspaceRequest): Observable<WorkspaceDto> {
    return this.put<WorkspaceDto>(`/workspaces/${workspaceId}`, request);
  }

  /**
   * Remove workspace
   */
  deleteWorkspace(workspaceId: string): Observable<void> {
    return this.delete<void>(`/workspaces/${workspaceId}`);
  }
}
