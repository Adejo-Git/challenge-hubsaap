import { ContextLite } from './context.model'

export class ContextRequired extends Error {
  readonly code = 'CONTEXT_REQUIRED'
  constructor(message = 'Context required') {
    super(message)
    this.name = 'ContextRequired'
  }
}

export class InvalidContext extends Error {
  readonly code = 'INVALID_CONTEXT'
  constructor(message = 'Invalid context') {
    super(message)
    this.name = 'InvalidContext'
  }
}

export class ContextNotAllowed extends Error {
  readonly code = 'CONTEXT_NOT_ALLOWED'
  constructor(message = 'Context not allowed') {
    super(message)
    this.name = 'ContextNotAllowed'
  }
}

export const ContextErrorModel = {
  ContextRequired: 'ContextRequired',
  InvalidContext: 'InvalidContext',
  ContextNotAllowed: 'ContextNotAllowed'
} as const

export interface RuntimeConfig {
  requireTenant?: boolean
  allowedEnvironments?: string[]
}

export function validateContext(ctx: ContextLite | null | undefined, cfg: RuntimeConfig = {}): void {
  if (!ctx) {
    if (cfg.requireTenant) throw new ContextRequired('Context is required but none provided')
    return
  }

  if (!ctx.tenantId || typeof ctx.tenantId !== 'string' || ctx.tenantId.trim() === '') {
    throw new InvalidContext('tenantId is missing or invalid')
  }

  if (ctx.environmentKey && cfg.allowedEnvironments && cfg.allowedEnvironments.length > 0) {
    if (!cfg.allowedEnvironments.includes(ctx.environmentKey)) {
      throw new ContextNotAllowed(`environment '${ctx.environmentKey}' not allowed`)
    }
  }

  // Minimal structural checks (no PII)
  const isStringOrNull = (v: unknown) => v === null || v === undefined || typeof v === 'string'
  if (!isStringOrNull(ctx.clientId) || !isStringOrNull(ctx.projectId)) {
    throw new InvalidContext('clientId/projectId must be strings or null')
  }
}
