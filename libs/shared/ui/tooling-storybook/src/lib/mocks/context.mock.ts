/**
 * Mock mínimo de contexto/sessão para usar em stories.
 * Consumidores podem importar e adaptar para seus stories.
 */
export function createMockContext(overrides?: Partial<Record<string, unknown>>) {
  return {
    session: {
      userId: 'mock-user',
      userName: 'Usuário Mock',
      roles: ['user'],
      ...((overrides && (overrides.session as Record<string, unknown>)) || {})
    },
    tenant: {
      tenantId: 'mock-tenant',
      tenantName: 'Tenant Mock',
      ...((overrides && (overrides.tenant as Record<string, unknown>)) || {})
    },
    ...overrides
  };
}

export default createMockContext;
