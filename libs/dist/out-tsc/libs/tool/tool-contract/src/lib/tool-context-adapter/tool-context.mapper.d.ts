/**
 * Mappers: Access Layer models → Tool Contract models
 *
 * Responsabilidades:
 * - Traduzir tipos internos do Hub para contratos estáveis da Tool
 * - Aplicar redaction (remover dados sensíveis)
 * - Garantir imutabilidade (deep freeze em dev mode)
 * - Normalizar nomenclaturas (clienteId → clientId, etc.)
 */
import { ToolSession, ToolContext, ToolRuntimeCapabilities } from './tool-context.model';
import { ISession, IAppContext } from './tool-context-adapter.service.interfaces';
/**
 * Mapeia sessão do Access Layer para ToolSession
 * Remove dados sensíveis (token completo, claims extras)
 */
export declare function mapToToolSession(session: ISession | null): ToolSession | null;
/**
 * Mapeia contexto do Access Layer para ToolContext
 * Normaliza nomenclaturas e garante shape consistente
 */
export declare function mapToToolContext(appContext: IAppContext, session: ToolSession): ToolContext;
/**
 * Mapeia flags e decisões para ToolCapabilities
 */
export declare function mapToToolRuntimeCapabilities(enabledFeatures: string[], allowedActions: string[], isToolEnabled: boolean, disabledReason?: string): ToolRuntimeCapabilities;
/**
 * Detecta tipo de mudança comparando contextos
 */
export declare function detectChangeType(previous: ToolContext | null, current: ToolContext): 'tenant' | 'client' | 'project' | 'session' | 'full';
//# sourceMappingURL=tool-context.mapper.d.ts.map