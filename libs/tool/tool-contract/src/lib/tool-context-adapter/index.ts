/**
 * Barrel exports do ToolContextAdapter
 * 
 * API pública exposta para Tools.
 * Tools devem importar apenas deste módulo, nunca diretamente do Access Layer.
 */

// Adapter principal
export { ToolContextAdapter } from './tool-context-adapter';

// Modelos contratuais
export {
  ToolSession,
  ToolContext,
  ToolRuntimeCapabilities,
  ToolContextSnapshot,
  ToolContextChange,
} from './tool-context.model';

// Interfaces abstratas (para implementação futura dos serviços reais)
export {
  ISessionService,
  IContextService,
  IFeatureFlagService,
  IAccessDecisionService,
  ISession,
  IAppContext,
  IAccessDecision,
} from './tool-context-adapter.service.interfaces';

// Mappers (útil para testes de Tools)
export {
  mapToToolSession,
  mapToToolContext,
  mapToToolRuntimeCapabilities,
  detectChangeType,
} from './tool-context.mapper';
