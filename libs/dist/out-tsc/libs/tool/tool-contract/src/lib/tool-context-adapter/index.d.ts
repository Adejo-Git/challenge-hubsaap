/**
 * Barrel exports do ToolContextAdapter
 *
 * API pública exposta para Tools.
 * Tools devem importar apenas deste módulo, nunca diretamente do Access Layer.
 */
export { ToolContextAdapter } from './tool-context-adapter';
export { ToolSession, ToolContext, ToolRuntimeCapabilities, ToolContextSnapshot, ToolContextChange, } from './tool-context.model';
export { ISessionService, IContextService, IFeatureFlagService, IAccessDecisionService, ISession, IAppContext, IAccessDecision, } from './tool-context-adapter.service.interfaces';
export { mapToToolSession, mapToToolContext, mapToToolRuntimeCapabilities, detectChangeType, } from './tool-context.mapper';
//# sourceMappingURL=index.d.ts.map