import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Requisitos declarativos de acesso extraídos de rota, ferramenta, menu ou ação.
 *
 * Esta interface representa o contrato de configuração em route.data / metadata
 * Angular. Para avaliar acesso, mapeie para AccessDecisionRequest e use
 * AccessDecisionService (@hub/access-decision).
 *
 * Nota: permissionKeys e policyKeys são arrays para suporte a múltiplas chaves
 * no nível de declaração de rota. A política de avaliação (qualquer / todos)
 * é definida pelo consumidor ao montar AccessDecisionRequest.
 */
export interface Requirements {
  toolKey?: string;
  featureFlagKey?: string;
  permissionKeys?: string[];
  policyKeys?: string[];
  contextRequired?: boolean;
}

export interface ToolMetadata {
  toolKey?: string;
  featureFlagKey?: string;
  permissionKeys?: string[];
  policyKeys?: string[];
  contextRequired?: boolean;
}

export interface MenuItem {
  requirements?: Requirements;
}

export interface ActionMetadata {
  actionKey: string;
  requirements?: Requirements;
}

export function extractRequirementsFromRoute(route: ActivatedRouteSnapshot): Requirements {
  const data = route.data || {};
  return {
    toolKey: data['toolKey'],
    featureFlagKey: data['featureFlagKey'],
    permissionKeys: data['permissionKeys'],
    policyKeys: data['policyKeys'],
    contextRequired: data['contextRequired'],
  };
}

export function extractRequirementsFromTool(metadata: ToolMetadata): Requirements {
  return {
    toolKey: metadata.toolKey,
    featureFlagKey: metadata.featureFlagKey,
    permissionKeys: metadata.permissionKeys,
    policyKeys: metadata.policyKeys,
    contextRequired: metadata.contextRequired,
  };
}

export function extractRequirementsFromMenuItem(menuItem: MenuItem): Requirements {
  return menuItem.requirements || {};
}

export function extractRequirementsFromAction(action: ActionMetadata): Requirements {
  return action.requirements || {};
}
