/**
 * Modelos contratuais do ToolContextAdapter
 *
 * Estes tipos são a interface estável entre o Hub e as Tools.
 * Evitam que Tools dependam de tipos internos do Access Layer.
 *
 * Design principles:
 * - Minimal surface: apenas o necessário para Tools
 * - Immutable: Tools não devem modificar o contexto do Hub
 * - Versionable: permitir evolução sem quebrar Tools existentes
 * - No sensitive data: apenas IDs e claims essenciais
 */
export {};
//# sourceMappingURL=tool-context.model.js.map