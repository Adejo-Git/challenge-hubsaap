/**
 * tool-registry.validation.ts
 *
 * Validações de modo desenvolvimento para o ToolRegistry.
 *
 * ATENÇÃO: Este módulo é ativo SOMENTE em modo desenvolvimento (isDevMode).
 * Em produção, as funções retornam sem efeito para não degradar performance.
 *
 * Responsabilidades:
 * - Detectar toolKeys duplicados no catálogo (colisão silenciosa é um bug crítico).
 * - Detectar deepLinks inválidos (paths inconsistentes com o entryPath da tool).
 * - Detectar metadata ausente ou inválida (campos obrigatórios faltando).
 * - Emitir console.warn para warnings não bloqueantes.
 * - Emitir console.error para erros que causariam defeitos em runtime.
 *
 * Não-responsabilidades:
 * - Não lançar exceções em produção.
 * - Não validar autorização ou flags (isso é Access Layer).
 */

import { ToolDescriptor } from './tool-registry.model';

/**
 * Resultado de validação de um catálogo de tools.
 */
export interface RegistryValidationResult {
  /** true se nenhum erro crítico foi encontrado. */
  isValid: boolean;
  /** Lista de erros críticos (causariam comportamento incorreto em runtime). */
  errors: string[];
  /** Lista de warnings (não bloqueantes, mas indicam drift ou descuido). */
  warnings: string[];
}

/**
 * Detecta toolKeys duplicados na lista de descritores.
 * Duplicidade silenciosa em runtime faria a segunda tool sobrescrever a primeira no catálogo.
 *
 * @param descriptors - Lista de ToolDescriptors a verificar.
 * @returns Lista de toolKeys que aparecem mais de uma vez.
 */
export function detectDuplicateKeys(descriptors: ToolDescriptor[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const d of descriptors) {
    if (seen.has(d.toolKey)) {
      duplicates.add(d.toolKey);
    }
    seen.add(d.toolKey);
  }

  return Array.from(duplicates);
}

/**
 * Valida deepLinks de cada tool para garantir consistência com o entryPath.
 *
 * Regras validadas:
 * - deepLink.path não pode ser vazio.
 * - deepLink.path não deve começar com '/' (deve ser relativo à rota base).
 * - deepLink.id não pode ser duplicado dentro da mesma tool.
 *
 * @param descriptors - Lista de ToolDescriptors a verificar.
 * @returns Lista de mensagens de warning sobre deepLinks inconsistentes.
 */
export function detectInvalidDeepLinks(descriptors: ToolDescriptor[]): string[] {
  const warnings: string[] = [];

  for (const d of descriptors) {
    const deepLinks = d.metadata?.deepLinks ?? [];
    const seenIds = new Set<string>();

    for (const link of deepLinks) {
      if (!link.path || link.path.trim() === '') {
        warnings.push(
          `[ToolRegistry] tool="${d.toolKey}" deepLink id="${link.id}" possui path vazio.`
        );
      }

      if (link.path?.startsWith('/')) {
        warnings.push(
          `[ToolRegistry] tool="${d.toolKey}" deepLink id="${link.id}" usa path absoluto "${link.path}". ` +
            `Prefira path relativo à rota base da tool.`
        );
      }

      if (seenIds.has(link.id)) {
        warnings.push(
          `[ToolRegistry] tool="${d.toolKey}" possui deepLink id="${link.id}" duplicado.`
        );
      }
      seenIds.add(link.id);
    }
  }

  return warnings;
}

/**
 * Valida campos obrigatórios do ToolDescriptor.
 *
 * Campos críticos: toolKey, label, group, entryPath, version.
 * Campos que geram warning: metadata.displayName, metadata.menuItems.
 *
 * @param descriptors - Lista de ToolDescriptors a verificar.
 * @returns Objeto com listas de erros e warnings.
 */
export function validateRequiredFields(descriptors: ToolDescriptor[]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const d of descriptors) {
    if (!d.toolKey) {
      errors.push(`[ToolRegistry] ToolDescriptor sem toolKey encontrado — não pode ser registrado.`);
    }

    if (!d.label) {
      errors.push(`[ToolRegistry] tool="${d.toolKey}" não possui label.`);
    }

    if (!d.group) {
      warnings.push(`[ToolRegistry] tool="${d.toolKey}" não possui group definido. Será agrupada como "default".`);
    }

    if (!d.entryPath) {
      errors.push(`[ToolRegistry] tool="${d.toolKey}" não possui entryPath. O Router não conseguirá fazer lazy loading.`);
    }

    if (!d.version) {
      warnings.push(`[ToolRegistry] tool="${d.toolKey}" não possui version definida. Drift de contrato não poderá ser detectado.`);
    }

    if (!d.metadata?.displayName) {
      warnings.push(
        `[ToolRegistry] tool="${d.toolKey}" não possui metadata.displayName. O label do descriptor será usado como fallback.`
      );
    }

    if (!d.metadata?.menuItems || d.metadata.menuItems.length === 0) {
      warnings.push(
        `[ToolRegistry] tool="${d.toolKey}" não possui menuItems. O menu desta tool ficará vazio.`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Executa todas as validações em modo desenvolvimento.
 *
 * Emite console.warn e console.error conforme severidade.
 * Em produção (isDevMode() = false), retorna resultado vazio sem processar.
 *
 * @param descriptors - Lista de ToolDescriptors a validar.
 * @param devMode - Se true, executa validações e emite logs. Se false, retorna imediatamente.
 * @returns RegistryValidationResult com resultado consolidado.
 */
export function runDevValidation(
  descriptors: ToolDescriptor[],
  devMode: boolean
): RegistryValidationResult {
  // Em produção, não executa validações para não degradar performance.
  if (!devMode) {
    return { isValid: true, errors: [], warnings: [] };
  }

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // 1. Verificar toolKeys duplicados (erro crítico).
  const duplicates = detectDuplicateKeys(descriptors);
  if (duplicates.length > 0) {
    const msg =
      `[ToolRegistry] ERRO CRÍTICO: toolKeys duplicados detectados: [${duplicates.join(', ')}]. ` +
      `Apenas o último descriptor registrado com este toolKey será mantido. ` +
      `Corrija antes de ir para produção!`;
    allErrors.push(msg);
    console.error(msg);
  }

  // 2. Verificar deepLinks inválidos (warnings).
  const deepLinkWarnings = detectInvalidDeepLinks(descriptors);
  for (const w of deepLinkWarnings) {
    allWarnings.push(w);
    console.warn(w);
  }

  // 3. Verificar campos obrigatórios.
  const { errors: fieldErrors, warnings: fieldWarnings } = validateRequiredFields(descriptors);
  for (const e of fieldErrors) {
    allErrors.push(e);
    console.error(e);
  }
  for (const w of fieldWarnings) {
    allWarnings.push(w);
    console.warn(w);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
