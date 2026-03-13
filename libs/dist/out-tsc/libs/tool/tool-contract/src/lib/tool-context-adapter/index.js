/**
 * Barrel exports do ToolContextAdapter
 *
 * API pública exposta para Tools.
 * Tools devem importar apenas deste módulo, nunca diretamente do Access Layer.
 */
// Adapter principal
export { ToolContextAdapter } from './tool-context-adapter';
// Mappers (útil para testes de Tools)
export { mapToToolSession, mapToToolContext, mapToToolRuntimeCapabilities, detectChangeType, } from './tool-context.mapper';
//# sourceMappingURL=index.js.map