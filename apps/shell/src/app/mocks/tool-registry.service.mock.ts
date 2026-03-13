import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ToolMetadata {
  key: string;
  name: string;
  description: string;
  icon: string;
  loadPath: string;
  enabled: boolean;
  permissions?: string[];
}

/**
 * ToolRegistryServiceMock
 * 
 * Mock do ToolRegistryService da Access Layer.
 * Simula o registro de ferramentas (tools) disponíveis no Hub.
 * 
 * TODO: Substituir por @hub/access-layer/tool-registry quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class ToolRegistryServiceMock {
  private readonly tools: Map<string, ToolMetadata> = new Map([
    [
      'dashboard',
      {
        key: 'dashboard',
        name: 'Dashboard',
        description: 'Visão geral do sistema',
        icon: 'dashboard',
        loadPath: '../../dummy-tool/dummy-tool.component',
        enabled: true,
        permissions: ['dashboard.view'],
      },
    ],
    [
      'analytics',
      {
        key: 'analytics',
        name: 'Analytics',
        description: 'Análises e relatórios',
        icon: 'analytics',
        loadPath: '../../dummy-tool/dummy-tool.component',
        enabled: true,
        permissions: ['analytics.view'],
      },
    ],
    [
      'settings',
      {
        key: 'settings',
        name: 'Configurações',
        description: 'Configurações do sistema',
        icon: 'settings',
        loadPath: '../../dummy-tool/dummy-tool.component',
        enabled: true,
        permissions: ['settings.view'],
      },
    ],
  ]);

  /**
   * Verifica se uma tool existe no registry
   */
  toolExists(toolKey: string): boolean {
    return this.tools.has(toolKey);
  }

  /**
   * Retorna metadados de uma tool específica
   */
  getTool(toolKey: string): ToolMetadata | undefined {
    return this.tools.get(toolKey);
  }

  /**
   * Retorna todas as tools registradas
   */
  getAllTools(): Observable<ToolMetadata[]> {
    return of(Array.from(this.tools.values()));
  }

  /**
   * Retorna tools habilitadas
   */
  getEnabledTools(): Observable<ToolMetadata[]> {
    const enabled = Array.from(this.tools.values()).filter((t) => t.enabled);
    return of(enabled);
  }
}
