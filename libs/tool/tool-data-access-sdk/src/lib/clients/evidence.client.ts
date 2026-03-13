/**
 * Evidence Client
 * 
 * Client tipado para operações de Evidence.
 * Exemplo adicional de client específico.
 * 
 * Responsabilidades:
 * - Prover métodos tipados para Evidence
 * - Encapsular paths e DTOs específicos de Evidence
 * - Retornar Observables tipados
 * 
 * Não-responsabilidades:
 * - Implementar lógica de negócio/validação
 * - Decidir UX/UI
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseClient } from './base.client';
import { CreateEvidenceRequest, EvidenceDto, PaginatedResponse } from '../models/dto.model';

@Injectable({
  providedIn: 'root',
})
export class EvidenceClient extends BaseClient {
  /**
   * Busca evidence por ID
   */
  getEvidence(evidenceId: string): Observable<EvidenceDto> {
    return this.get<EvidenceDto>(`/evidences/${evidenceId}`);
  }

  /**
   * Lista evidences de um workspace
   */
  listEvidencesByWorkspace(workspaceId: string): Observable<PaginatedResponse<EvidenceDto>> {
    return this.get<PaginatedResponse<EvidenceDto>>(`/workspaces/${workspaceId}/evidences`);
  }

  /**
   * Cria nova evidence
   */
  createEvidence(request: CreateEvidenceRequest): Observable<EvidenceDto> {
    return this.post<EvidenceDto>('/evidences', request);
  }

  /**
   * Remove evidence
   */
  deleteEvidence(evidenceId: string): Observable<void> {
    return this.delete<void>(`/evidences/${evidenceId}`);
  }
}
