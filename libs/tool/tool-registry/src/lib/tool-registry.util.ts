/**
 * tool-registry.util.ts
 *
 * Helpers de manipulação do catálogo de tools.
 *
 * Responsabilidades:
 * - Merge transparente entre runtime config e build exports.
 * - Ordenação por group + order.
 * - Filtro por feature flags efetivas.
 *
 * Sem IO, sem efeitos colaterais — funções puras.
 */

import { ToolKey, ToolMenuItem } from '@hub/tool-contract';
import {
  MenuNode,
  ToolCatalog,
  ToolDescriptor,
  ToolGroup,
  ToolRuntimeConfig,
} from './tool-registry.model';

/**
 * Combina uma lista de ToolDescriptors exportados em build com overrides do RuntimeConfig.
 * 
 * Regras de merge:
 * - Tools não presentes em enabledTools (quando definido) são removidas.
 * - Overrides de group/order do RuntimeConfig sobrescrevem os valores do descriptor.
 * - Tools sem override são incluídas com seus valores originais.
 *
 * @param descriptors - Descritores vindos dos exports de cada tool (build-time).
 * @param runtimeConfig - Configuração de runtime (OnPrem ou SaaS): lista de tools habilitadas + overrides.
 * @returns Lista de ToolDescriptors resultante após merge.
 */
export function mergeWithRuntimeConfig(
  descriptors: ToolDescriptor[],
  runtimeConfig?: ToolRuntimeConfig
): ToolDescriptor[] {
  if (!runtimeConfig) {
    // Sem configuração de runtime: retorna todos como habilitados.
    return descriptors.map((d) => ({ ...d, enabled: d.enabled ?? true }));
  }

  const { enabledTools, overrides } = runtimeConfig;

  return descriptors
    .filter((d) => {
      // Se enabledTools está definido, apenas tools presentes são mantidas.
      if (enabledTools && enabledTools.length > 0) {
        return enabledTools.includes(d.toolKey);
      }
      return true;
    })
    .map((d) => {
      const override = overrides?.[d.toolKey];
      return override 
        ? { ...d, ...override, enabled: d.enabled ?? true }
        : { ...d, enabled: d.enabled ?? true };
    });
}

/**
 * Ordena ToolDescriptors por group (alfabético) e depois por order (numérico crescente).
 * Tools do mesmo group com mesmo order são ordenadas pelo toolKey como desempate.
 *
 * @param descriptors - Lista de ToolDescriptors a ordenar.
 * @returns Nova lista ordenada (sem mutação).
 */
export function sortToolDescriptors(descriptors: ToolDescriptor[]): ToolDescriptor[] {
  return [...descriptors].sort((a, b) => {
    // 1. Ordenar por group alfabeticamente.
    const groupCmp = a.group.localeCompare(b.group);
    if (groupCmp !== 0) return groupCmp;

    // 2. Ordenar por order numericamente.
    const orderCmp = a.order - b.order;
    if (orderCmp !== 0) return orderCmp;

    // 3. Desempate pelo toolKey (estabilidade).
    return a.toolKey.localeCompare(b.toolKey);
  });
}

/**
 * Filtra tools removendo as que possuem feature flag de habilitação desligada
 * nas flags efetivas do contexto atual.
 *
 * Lógica: uma tool é considerada desabilitada quando existe uma flag no formato
 * `<toolKey>.enabled` com valor `false` nas effectiveFlags.
 *
 * @param descriptors - Lista de ToolDescriptors a filtrar.
 * @param effectiveFlags - Mapa das flags efetivas no contexto atual (toolKey.featureKey → boolean).
 * @returns Lista com tools habilitadas pelo contexto de flags.
 */
export function filterByEffectiveFlags(
  descriptors: ToolDescriptor[],
  effectiveFlags: Record<string, boolean>
): ToolDescriptor[] {
  return descriptors.filter((d) => {
    // Flag padrão de habilitação da tool: `<toolKey>.enabled`
    const enabledFlagKey = `${d.toolKey}.enabled`;

    // Se a flag existir e for false, a tool é removida da view.
    if (enabledFlagKey in effectiveFlags) {
      return effectiveFlags[enabledFlagKey] !== false;
    }

    // Se a flag não existir, respeita o campo `enabled` do descriptor.
    return d.enabled !== false;
  });
}

/**
 * Constrói um ToolCatalog (Map) a partir de uma lista de ToolDescriptors.
 * O Map permite lookup O(1) por toolKey.
 *
 * @param descriptors - Lista de ToolDescriptors já validada e ordenada.
 * @returns ToolCatalog indexado por toolKey.
 */
export function buildCatalog(descriptors: ToolDescriptor[]): ToolCatalog {
  const catalog: ToolCatalog = new Map();
  for (const descriptor of descriptors) {
    catalog.set(descriptor.toolKey, descriptor);
  }
  return catalog;
}

/**
 * Converte um ToolDescriptor em um MenuNode de primeiro nível.
 * Sub-nós são derivados de ToolMenuMetadata.menuItems.
 *
 * @param descriptor - ToolDescriptor da tool.
 * @returns MenuNode pronto para consumo pelo NavigationService.
 */
export function descriptorToMenuNode(descriptor: ToolDescriptor): MenuNode {
  const { toolKey, label, group, order, entryPath, metadata } = descriptor;

  const children: MenuNode[] = (metadata.menuItems ?? []).map((item: ToolMenuItem, idx: number) => ({
    toolKey,
    label: item.label,
    icon: item.icon,
    path: item.path ? `${entryPath}/${item.path}` : entryPath,
    order: item.order ?? idx,
    group: group as ToolGroup,
    badge: item.badge,
    children: undefined,
  }));

  return {
    toolKey,
    label: metadata.displayName ?? label,
    icon: metadata.icon,
    path: entryPath,
    order,
    group,
    children: children.length > 0 ? children : undefined,
    badge: undefined,
    isBeta: metadata.isBeta,
  };
}

/**
 * Converte uma lista de ToolDescriptors em MenuNodes ordenados.
 * Útil para alimentar o NavigationService ou o menu do Shell.
 *
 * @param descriptors - ToolDescriptors após filtros de flags.
 * @returns MenuNodes ordenados por group e order.
 */
export function toMenuNodes(descriptors: ToolDescriptor[]): MenuNode[] {
  const sorted = sortToolDescriptors(descriptors);
  return sorted.map(descriptorToMenuNode);
}

/**
 * Extrai todos os toolKeys de um ToolCatalog como array.
 *
 * @param catalog - ToolCatalog (Map).
 * @returns Array de ToolKeys registradas.
 */
export function catalogKeys(catalog: ToolCatalog): ToolKey[] {
  return Array.from(catalog.keys());
}
