export interface ContextLite {
  tenantId: string
  clientId?: string | null
  projectId?: string | null
  environmentKey?: string | null
}

export type ContextKey = string
export type EnvironmentKey = string

export function buildContextKey(ctx: ContextLite): ContextKey {
  const tenant = ctx.tenantId ?? ''
  const client = ctx.clientId ?? ''
  const project = ctx.projectId ?? ''
  const env = ctx.environmentKey ?? ''
  return [tenant, client, project, env].join('|')
}

export function isSameContext(a: ContextLite | null, b: ContextLite | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return buildContextKey(a) === buildContextKey(b)
}
