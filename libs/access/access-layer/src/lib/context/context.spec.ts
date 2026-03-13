import { ContextService } from './context.service'
import { InMemoryContextStorage } from './context.storage'
import { ContextLite, ContextKey } from './context.model'
import { validateContext, ContextRequired, InvalidContext } from './context.validation'
import { buildContextKey } from './context.model'
import { of } from 'rxjs'
import { switchMap, tap } from 'rxjs/operators'

describe('ContextService basic flows', () => {
  const baseCtx: ContextLite = { tenantId: 't1', clientId: 'c1', projectId: 'p1', environmentKey: 'dev' }

  test('setContext updates snapshot and emits', async () => {
    const storage = new InMemoryContextStorage({ ttlSeconds: 60 })
    const svc = new ContextService(null, { allowedEnvironments: ['dev', 'prod'] }, storage)
    const emitted: (ContextLite | null)[] = []
    svc.context$().subscribe((c) => emitted.push(c))

    await svc.setContext(baseCtx, { persist: true, source: 'user' })
    expect(svc.snapshot()).toEqual(baseCtx)
    expect(emitted[emitted.length - 1]).toEqual(baseCtx)
  })

  test('setContext idempotent (no extra emission)', async () => {
    const svc = new ContextService(null)
    const emitted: (ContextLite | null)[] = []
    svc.context$().subscribe((c) => emitted.push(c))
    await svc.setContext(baseCtx)
    const countAfterFirst = emitted.length
    await svc.setContext(baseCtx)
    expect(emitted.length).toEqual(countAfterFirst)
  })

  test('clearContext clears and emits null', async () => {
    const storage = new InMemoryContextStorage()
    const svc = new ContextService(baseCtx, {}, storage)
    const emitted: (ContextLite | null)[] = []
    svc.context$().subscribe((c) => emitted.push(c))
    svc.clearContext({ source: 'user' })
    expect(svc.snapshot()).toBeNull()
    expect(emitted[emitted.length - 1]).toBeNull()
  })

  test('restoreFromStorage handles valid, expired and corrupted', async () => {
    const storage = new InMemoryContextStorage({ ttlSeconds: 1 })
    const svc = new ContextService(null, { allowedEnvironments: ['dev'] }, storage)
    // save valid
    await storage.save(baseCtx)
    await svc.restoreFromStorage()
    expect(svc.snapshot()).toEqual(baseCtx)

    // simulate expiry
    const storage2 = new InMemoryContextStorage({ ttlSeconds: 0 })
    await storage2.save(baseCtx)
    const svc2 = new ContextService(null, { allowedEnvironments: ['dev'] }, storage2)
    await svc2.restoreFromStorage()
    expect(svc2.snapshot()).toBeNull()

    // corrupted data
    const corruptStorage = new InMemoryContextStorage()
    const corrupt = {
      load: () => corruptStorage.load(),
      save: (ctx: ContextLite) => corruptStorage.save(ctx),
      clear: () => corruptStorage.clear(),
      store: corruptStorage as unknown as { store: Record<string, unknown> },
    }
    corrupt.store.store['context-lite'] = { notValue: 123 }

    const svc3 = new ContextService(null, {}, corrupt)
    await svc3.restoreFromStorage()
    expect(svc3.snapshot()).toBeNull()
  })

  test('validation throws on missing tenant when required', () => {
    expect(() => validateContext(null, { requireTenant: true })).toThrow(ContextRequired)
    expect(() => validateContext({ tenantId: '' } as unknown as ContextLite)).toThrow(InvalidContext)
  })

  test('changed$ emits minimal payload (key + source) and restore emits source=restore', async () => {
    const storage = new InMemoryContextStorage({ ttlSeconds: 60 })
    const svc = new ContextService(null, {}, storage)

    type ChangedEvent = { key: ContextKey; source: string } & Record<string, unknown>
    const events: ChangedEvent[] = []
    svc.changed$.subscribe((e) => events.push(e as ChangedEvent))

    await svc.setContext(baseCtx, { persist: true, source: 'user' })
    expect(events.length).toBeGreaterThanOrEqual(1)
    const ev = events[events.length - 1]
    expect(Object.keys(ev)).toEqual(expect.arrayContaining(['key', 'source']))
    // restore emits with source 'restore'
    events.length = 0
    await storage.save(baseCtx)
    await svc.restoreFromStorage()
    expect(events[events.length - 1].source).toEqual('restore')
  })

  test('consumer recomputes on context change (switchMap pattern)', async () => {
    const storage = new InMemoryContextStorage({ ttlSeconds: 60 })
    const svc = new ContextService(null, {}, storage)

    const calls: string[] = []
    function loadFor(ctx: ContextLite | null) {
      const key = ctx ? buildContextKey(ctx) : 'default'
      return of(key).pipe(tap((k) => calls.push(k)))
    }

    const results: string[] = []
    svc.context$().pipe(switchMap((ctx) => loadFor(ctx))).subscribe((r) => results.push(r))

    await svc.setContext(baseCtx, { persist: false, source: 'user' })
    expect(calls[calls.length - 1]).toEqual(buildContextKey(baseCtx))

    const another: Pick<ContextLite, 'tenantId'> = { tenantId: 't2' }
    await svc.setContext(another as unknown as ContextLite)
    expect(calls[calls.length - 1]).toEqual(buildContextKey(another as unknown as ContextLite))
  })

  test('bootstrap restore flow triggers changed$ and sets snapshot', async () => {
    const storage = new InMemoryContextStorage({ ttlSeconds: 60 })
    const svc = new ContextService(null, {}, storage)

    type ChangedEvent = { key: ContextKey; source: string } & Record<string, unknown>
    const events: ChangedEvent[] = []
    svc.changed$.subscribe((e) => events.push(e as ChangedEvent))

    await storage.save(baseCtx)
    // simulate bootstrap
    await svc.restoreFromStorage()

    expect(svc.snapshot()).toEqual(baseCtx)
    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(events[events.length - 1].source).toEqual('restore')
  })
})
