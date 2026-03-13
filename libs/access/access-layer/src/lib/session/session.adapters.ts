import { SessionState } from '@hub/auth-session'
import { SessionStateLite, ClaimsLite, UserLite } from './session.model'

export function mapSessionStateToLite(state: SessionState): SessionStateLite {
  return {
    authenticated: state.authenticated,
    status: state.status,
    user: state.user ? mapUserToLite(state.user) : null,
    claims: state.claims ? mapClaimsToLite(state.claims) : null,
    exp: state.exp ?? null
  }
}

function mapUserToLite(user: Record<string, unknown>): UserLite {
  return {
    id: extractString(user['id']),
    name: extractString(user['name']),
    email: extractString(user['email'])
  }
}

function mapClaimsToLite(claims: Record<string, unknown>): ClaimsLite {
  const lite: ClaimsLite = {
    sub: extractString(claims['sub']),
    email: extractString(claims['email']),
    roles: extractStringArray(claims['roles']),
    groups: extractStringArray(claims['groups'])
  }

  const custom = extractCustomClaims(claims)
  // garantir que o merge respeita o index signature de ClaimsLite
  return { ...lite, ...custom } as ClaimsLite
}

function extractCustomClaims(
  claims: Record<string, unknown>
): Record<string, string | number | boolean | string[]> {
  const reserved = ['sub', 'email', 'roles', 'groups', 'aud', 'iss', 'iat', 'exp', 'nbf']
  const custom: Record<string, string | number | boolean | string[]> = {}

  for (const [key, value] of Object.entries(claims)) {
    if (reserved.includes(key)) continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      custom[key] = value
    } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      custom[key] = value
    }
  }

  return custom
}

function extractString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function extractStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  if (value.every((v) => typeof v === 'string')) return value as string[]
  return undefined
}
