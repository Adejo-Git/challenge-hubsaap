/**
 * tool-registry.service.ts
 *
 * Serviço core do ToolRegistry.
 *
 * Responsabilidades:
 * - Carregar e armazenar em memória o catálogo unificado de tools (Runtime Catalog).
 * - Expor APIs determinísticas de lookup: exists, getTool, listTools, getMenuNodes.
 * - Integrar com FeatureFlagService para filtrar tools desabilitadas por contexto.
 * - Emitir erros padronizados (error-model) para casos como toolNotFound e contractInvalid.
 * - Registrar eventos de observabilidade (registry.loaded, tool.notFound, contract.invalid).
 *
 * Não-responsabilidades:
 * - Não executar lazy loading de módulos Angular.
 * - Não decidir autorização (isso é access-decision + guards).
 * - Não persistir catálogo (é configuração/runtime, vive em memória).
 */

import { ToolKey } from '@hub/tool-contract';
import { ErrorCategory, ErrorCode, Severity, StandardError } from '@hub/error-model';
import {
  MenuNode,
  ToolCatalog,
  ToolDescriptor,
  ToolLookupResult,
  ToolRuntimeConfig,
} from './tool-registry.model';
import {
  buildCatalog,
  filterByEffectiveFlags,
  mergeWithRuntimeConfig,
  sortToolDescriptors,
  toMenuNodes,
} from './tool-registry.util';
import { runDevValidation } from './tool-registry.validation';

// ---------------------------------------------------------------------------
// Interfaces de dependências externas (duck-typing para inversão de controle)
// ---------------------------------------------------------------------------

/**
 * Interface mínima esperada do FeatureFlagService.
 * Permite que o Registry solicite a resolução de flags efetivas para um contexto.
 */
export interface ToolRegistryFeatureFlagPort {
  /**
   * Retorna o mapa de flags efetivas para o contexto atual.
   * Formato: `<toolKey>.<featureKey>` → boolean.
   */
  getEffectiveFlags(): Record<string, boolean>;
}

/**
 * Interface mínima esperada do ObservabilityService.
 * Permite registrar eventos de ciclo de vida do Registry.
 */
export interface ToolRegistryObservabilityPort {
  track(eventName: string, metadata?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Configuração de inicialização do Registry
// ---------------------------------------------------------------------------

/**
 * Configuração necessária para inicializar o ToolRegistryService.
 */
export interface ToolRegistryConfig {
  /**
   * Lista de ToolDescriptors exportados pelas tools em build-time.
   * Normalmente vem dos tokens de injeção das tools registradas.
   */
  descriptors: ToolDescriptor[];

  /**
   * Configuração de runtime (opcional).
   * Define quais tools estão habilitadas no cliente atual (OnPrem) e overrides de ordem/grupo.
   */
  runtimeConfig?: ToolRuntimeConfig;

  /**
   * Se true, executa validações dev (duplicidade, deepLinks inválidos, campos ausentes).
   * Recomendado: usar `isDevMode()` do Angular ou `!environment.production`.
   */
  devMode?: boolean;
}

// ---------------------------------------------------------------------------
// ToolRegistryService
// ---------------------------------------------------------------------------

/**
 * ToolRegistryService: fonte única do catálogo de tools disponíveis no Hub.
 *
 * Uso:
 * ```ts
 * const registry = new ToolRegistryService(
 *   { descriptors: allToolDescriptors, runtimeConfig, devMode: !environment.production },
 *   featureFlagService,
 *   observabilityService
 * );
 *
 * registry.load();
 *
 * const exists = registry.exists('financeiro' as ToolKey);
 * const tool = registry.getTool('financeiro' as ToolKey);
 * const menu = registry.getMenuNodes();
 * ```
 *
 * IMPORTANTE: Chame `load()` durante o bootstrap do Hub antes de
 * usar qualquer outro método. Chamar métodos antes de `load()` lança erro.
 */
export class ToolRegistryService {
  /** Catálogo em memória — indexado por toolKey para lookup O(1). */
  private catalog: ToolCatalog | null = null;

  /** Indica se o catálogo foi carregado com sucesso. */
  private loaded = false;

  constructor(
    private readonly config: ToolRegistryConfig,
    private readonly featureFlags?: ToolRegistryFeatureFlagPort,
    private readonly observability?: ToolRegistryObservabilityPort
  ) {}

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------

  /**
   * Carrega e valida o catálogo de tools.
   *
   * Deve ser chamado uma única vez durante o bootstrap do Hub (ex: APP_INITIALIZER).
   * Idempotente: chamadas subsequentes recarregam o catálogo (útil para context switch).
   *
   * Sequência:
   * 1. Merge com RuntimeConfig (tools habilitadas por cliente + overrides).
   * 2. Validações dev (se devMode = true).
   * 3. Filtro por Feature Flags efetivas.
   * 4. Ordenação por group + order.
   * 5. Construção do Map (ToolCatalog).
   * 6. Registro do evento de observabilidade registry.loaded.
   */
  load(): void {
    const { descriptors, runtimeConfig, devMode = false } = this.config;

    // 1. Merge com configuração de runtime.
    const merged = mergeWithRuntimeConfig(descriptors, runtimeConfig);

    // 2. Validações de modo desenvolvimento.
    const validationResult = runDevValidation(merged, devMode);

    // Em dev, registra evento se contrato inválido.
    if (devMode && !validationResult.isValid) {
      this.observability?.track('registry.contract.invalid', {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
    }

    // 3. Filtro por Feature Flags efetivas.
    const effectiveFlags = this.featureFlags?.getEffectiveFlags() ?? {};
    const filtered = filterByEffectiveFlags(merged, effectiveFlags);

    // 4. Ordenação por group + order.
    const sorted = sortToolDescriptors(filtered);

    // 5. Construção do catálogo indexado.
    this.catalog = buildCatalog(sorted);
    this.loaded = true;

    // 6. Evento de observabilidade.
    this.observability?.track('registry.loaded', {
      totalTools: this.catalog.size,
      toolKeys: Array.from(this.catalog.keys()),
    });
  }

  // -------------------------------------------------------------------------
  // API Pública de Lookup
  // -------------------------------------------------------------------------

  /**
   * Verifica se uma tool existe e está habilitada no catálogo atual.
   *
   * Usado pelos RouteGuards para validar toolKey antes de ativar a rota.
   *
   * @param toolKey - Identificador da tool.
   * @returns true se a tool existe no catálogo; false caso contrário.
   * @throws StandardError (contractInvalid) se o catálogo não foi carregado.
   */
  exists(toolKey: ToolKey): boolean {
    return this.getCatalog().has(toolKey);
  }

  /**
   * Busca um ToolDescriptor pelo toolKey.
   *
   * @param toolKey - Identificador da tool.
   * @returns ToolLookupResult discriminado: found=true com descriptor, ou found=false com reason.
   * @throws StandardError (contractInvalid) se o catálogo não foi carregado.
   */
  getTool(toolKey: ToolKey): ToolLookupResult {
    const descriptor = this.getCatalog().get(toolKey);

    if (!descriptor) {
      this.observability?.track('registry.tool.notFound', { toolKey });
      return { found: false, toolKey, reason: 'notFound' };
    }

    return { found: true, descriptor };
  }

  /**
   * Lista todos os ToolDescriptors do catálogo atual.
   * A lista já está ordenada por group + order.
   *
   * @returns Array de ToolDescriptors registrados e habilitados.
   * @throws StandardError (contractInvalid) se o catálogo não foi carregado.
   */
  listTools(): ToolDescriptor[] {
    return Array.from(this.getCatalog().values());
  }

  /**
   * Retorna a árvore de MenuNodes derivada do catálogo.
   *
   * Os nós são filtrados por flags e ordenados, prontos para consumo pelo NavigationService.
   * Não inclui lógica de autorização — apenas habilitação.
   *
   * @returns Array de MenuNodes de primeiro nível prontos para renderização.
   * @throws StandardError (contractInvalid) se o catálogo não foi carregado.
   */
  getMenuNodes(): MenuNode[] {
    this.assertLoaded();
    const tools = this.listTools();
    return toMenuNodes(tools);
  }

  // -------------------------------------------------------------------------
  // Reload (Context Switching)
  // -------------------------------------------------------------------------

  /**
   * Recarrega o catálogo após uma mudança de contexto.
   *
   * Deve ser chamado quando o contexto muda (ex: troca de tenant/cliente)
   * para recalcular as tools disponíveis com as novas Feature Flags.
   *
   * Equivalente a chamar `load()` novamente.
   */
  reload(): void {
    this.loaded = false;
    this.catalog = null;
    this.load();
  }

  // -------------------------------------------------------------------------
  // Estado interno
  // -------------------------------------------------------------------------

  /**
   * Indica se o catálogo foi carregado com sucesso.
   * Útil para guards e loaders aguardarem o bootstrap.
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  // -------------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------------

  /**
   * Garante que o catálogo foi carregado antes de usar a API.
   * Lança StandardError padronizado (error-model) se o catálogo não está disponível.
   */
  private assertLoaded(): void {
    if (!this.loaded || !this.catalog) {
      const error: StandardError = {
        category: ErrorCategory.VALIDATION,
        code: ErrorCode.VALIDATION_ERROR,
        severity: Severity.ERROR,
        userMessage: 'O ToolRegistry não foi inicializado. Chame load() durante o bootstrap do Hub.',
        technicalMessage:
          'ToolRegistryService.assertLoaded: catálogo não disponível. ' +
          'Verifique se ToolRegistryService.load() foi chamado no APP_INITIALIZER.',
        timestamp: new Date().toISOString(),
        source: 'ToolRegistryService',
      };

      this.observability?.track('registry.contract.invalid', {
        reason: 'catalogNotLoaded',
      });

      throw error;
    }
  }

  /**
   * Retorna o catálogo garantindo que foi carregado.
   * Helper interno para evitar non-null assertions.
   */
  private getCatalog(): ToolCatalog {
    this.assertLoaded();
    return this.catalog as ToolCatalog;
  }

  /**
   * Constrói um StandardError padronizado para tool não encontrada.
   * Exposto para facilitar uso por Guards e outros consumidores do Registry.
   *
   * @param toolKey - ToolKey que não foi encontrado.
   * @returns StandardError com code NOT_FOUND.
   */
  buildNotFoundError(toolKey: ToolKey): StandardError {
    return {
      category: ErrorCategory.VALIDATION,
      code: ErrorCode.NOT_FOUND,
      severity: Severity.WARNING,
      userMessage: `A ferramenta "${toolKey}" não foi encontrada no Hub.`,
      technicalMessage: `ToolRegistryService: toolKey="${toolKey}" não encontrado no catálogo.`,
      timestamp: new Date().toISOString(),
      source: 'ToolRegistryService',
      detailsSafe: { toolKey },
    };
  }
}
