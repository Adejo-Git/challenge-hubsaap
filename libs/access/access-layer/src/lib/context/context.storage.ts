import { ContextLite } from './context.model'

export interface ContextStorage {
  load(): Promise<ContextLite | null>
  save(ctx: ContextLite): Promise<void>
  clear(): Promise<void>
}

export interface StorageOptions {
  ttlSeconds?: number // optional TTL in seconds
  scopeKey?: string // additional scope to segment storage (user/session/tenant)
}

type StoredRecord = {
  value: ContextLite
  expiresAt: number | null
}

function isStoredRecord(raw: unknown): raw is StoredRecord {
  if (typeof raw !== 'object' || raw === null) return false
  const rec = raw as Record<string, unknown>
  return 'value' in rec && 'expiresAt' in rec
}

// Simple in-memory storage implementation with TTL for tests/demo.
export class InMemoryContextStorage implements ContextStorage {
  private key = 'context-lite'
  // use unknown instead of any
  private store: Record<string, unknown> = {}
  private opts: StorageOptions

  constructor(opts: StorageOptions = {}) {
    this.opts = opts
    if (opts.scopeKey) this.key = `${this.key}:${opts.scopeKey}`
  }

  async load(): Promise<ContextLite | null> {
    const raw = this.store[this.key]
    if (!raw) return null
    try {
      if (!isStoredRecord(raw)) {
        delete this.store[this.key]
        return null
      }

      const { value, expiresAt } = raw
      if (typeof expiresAt === 'number' && Date.now() >= expiresAt) {
        delete this.store[this.key]
        return null
      }
      return value
    } catch (_e) {
      delete this.store[this.key]
      void _e
      return null
    }
  }

  async save(ctx: ContextLite): Promise<void> {
    const expiresAt = typeof this.opts.ttlSeconds === 'number' ? Date.now() + this.opts.ttlSeconds * 1000 : null
    this.store[this.key] = { value: ctx, expiresAt } satisfies StoredRecord
  }

  async clear(): Promise<void> {
    delete this.store[this.key]
  }
}
