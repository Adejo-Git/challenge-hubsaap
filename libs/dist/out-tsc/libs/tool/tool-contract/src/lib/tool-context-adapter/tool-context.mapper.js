/**
 * Mappers: Access Layer models → Tool Contract models
 *
 * Responsabilidades:
 * - Traduzir tipos internos do Hub para contratos estáveis da Tool
 * - Aplicar redaction (remover dados sensíveis)
 * - Garantir imutabilidade (deep freeze em dev mode)
 * - Normalizar nomenclaturas (clienteId → clientId, etc.)
 */
/**
 * Mapeia sessão do Access Layer para ToolSession
 * Remove dados sensíveis (token completo, claims extras)
 */
export function mapToToolSession(session) {
    if (!session?.user) {
        return null;
    }
    const toolSession = {
        userId: session.user.id,
        userName: session.user.name,
        userEmail: session.user.email,
        roles: [...session.user.roles], // Clone para imutabilidade
        expiresAt: session.expiresAt ? session.expiresAt.getTime() : Date.now() + 3600000,
    };
    return toolSession;
}
/**
 * Mapeia contexto do Access Layer para ToolContext
 * Normaliza nomenclaturas e garante shape consistente
 */
export function mapToToolContext(appContext, session) {
    const toolContext = {
        session,
        tenantId: appContext.tenantId,
        tenantName: appContext.tenantName,
        // Normaliza: clienteId → clientId (consistência)
        clientId: appContext.clienteId,
        clientName: appContext.clienteName || null,
        // Normaliza: projetoId → projectId
        projectId: appContext.projetoId,
        projectName: appContext.projetoName || null,
        environment: appContext.environment,
        updatedAt: Date.now(),
    };
    return toolContext;
}
/**
 * Mapeia flags e decisões para ToolCapabilities
 */
export function mapToToolRuntimeCapabilities(enabledFeatures, allowedActions, isToolEnabled, disabledReason) {
    const capabilities = {
        enabledFeatures: [...enabledFeatures],
        allowedActions: [...allowedActions],
        isToolEnabled,
        disabledReason,
    };
    return capabilities;
}
/**
 * Detecta tipo de mudança comparando contextos
 */
export function detectChangeType(previous, current) {
    if (!previous) {
        return 'full';
    }
    if (previous.session.userId !== current.session.userId) {
        return 'session';
    }
    if (previous.tenantId !== current.tenantId) {
        return 'tenant';
    }
    if (previous.clientId !== current.clientId) {
        return 'client';
    }
    if (previous.projectId !== current.projectId) {
        return 'project';
    }
    return 'full'; // Alguma outra mudança
}
//# sourceMappingURL=tool-context.mapper.js.map