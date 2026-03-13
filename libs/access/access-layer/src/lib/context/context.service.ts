import { BehaviorSubject, Observable, Subject } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import { ContextLite, buildContextKey, isSameContext } from './context.model'
import { validateContext, RuntimeConfig } from './context.validation'
import { ContextStorage } from './context.storage'

export interface SetContextOptions {
  source?: string
  persist?: boolean
}

export interface ClearContextOptions {
  source?: string
}

function swallowContextStorageError(_error?: unknown): void {
  // mark param as used to satisfy eslint (best-effort swallow)
  void _error
  return
}

export class ContextService {
  private subject: BehaviorSubject<ContextLite | null>
  private invalidation = new Subject<void>()
  readonly changed$ = new Subject<{ key?: string; source?: string }>()

  constructor(
    initial: ContextLite | null = null,
    private cfg: RuntimeConfig = {},
    private storage?: ContextStorage
  ) {
    this.subject = new BehaviorSubject<ContextLite | null>(initial)
  }

  context$(): Observable<ContextLite | null> {
    return this.subject.asObservable().pipe(distinctUntilChanged((a, b) => isSameContext(a, b)))
  }

  snapshot(): ContextLite | null {
    return this.subject.getValue()
  }

  async setContext(next: ContextLite, options: SetContextOptions = {}): Promise<void> {
    validateContext(next, this.cfg)
    const current = this.snapshot()
    if (isSameContext(current, next)) return

    this.subject.next(next)
    const key = buildContextKey(next)
    if (options.persist && this.storage) {
      try {
        await this.storage.save(next)
      } catch (_e) {
        // swallow storage errors; telemetry can be added elsewhere
        void _e
      }
    }
    this.changed$.next({ key, source: options.source })
    this.invalidation.next()
  }

  async restoreFromStorage(): Promise<void> {
    if (!this.storage) return
    const loaded = await this.storage.load()
    if (!loaded) return
    try {
      validateContext(loaded, this.cfg)
      this.subject.next(loaded)
      this.changed$.next({ key: buildContextKey(loaded), source: 'restore' })
      this.invalidation.next()
    } catch (_e) {
      // invalid stored context -> clear storage
      await this.storage.clear()
      void _e
    }
  }

  clearContext(options: ClearContextOptions = {}): void {
    this.subject.next(null)
    if (this.storage) {
      try {
        this.storage.clear().catch(swallowContextStorageError)
      } catch (_e) {
        swallowContextStorageError(_e)
      }
    }
    this.changed$.next({ key: undefined, source: options.source })
    this.invalidation.next()
  }

  // optional: allow consumers to listen for explicit invalidation
  contextInvalidation$(): Observable<void> {
    return this.invalidation.asObservable()
  }
}
