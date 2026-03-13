// Minimal mock for @angular/core/testing used by unit tests

type ProviderToken = unknown

type ValueProvider = { provide: ProviderToken; useValue: unknown }

type ClassConstructor<T = unknown> = new (...args: unknown[]) => T

type TestingModuleConfig = {
  providers?: unknown[]
}

function isValueProvider(p: unknown): p is ValueProvider {
  return typeof p === 'object' && p !== null && 'provide' in p && 'useValue' in p
}

function isConstructor(p: unknown): p is ClassConstructor {
  return typeof p === 'function'
}

export const TestBed = {
  _providers: [] as unknown[],
  configureTestingModule(cfg: TestingModuleConfig) {
    this._providers = cfg?.providers || []
  },
  inject<T = unknown>(token: unknown): T {
    // Prefer explicit provider with provide/useValue
    for (const p of (this._providers || [])) {
      if (isValueProvider(p) && p.provide === token) return p.useValue as T
    }

    // If token is a constructor, try to instantiate using value providers as dependencies
    if (isConstructor(token)) {
      // Collect useValue providers (very small subset of Angular DI)
      const valueProviders = (this._providers || []).filter(isValueProvider)

      try {
        // Heuristic: pass all configured useValue providers into constructor in the order registered.
        // This matches our current testbed usage pattern within this repo.
        const args = valueProviders.map((vp) => vp.useValue)
        return new (token as ClassConstructor<T>)(...args)
      } catch {
        // fallback: no-arg constructor
        try {
          return new (token as ClassConstructor<T>)()
        } catch {
          return undefined as unknown as T
        }
      }
    }

    // If token is provided as a class constructor in providers array, instantiate it.
    for (const p of (this._providers || [])) {
      if (p === token && isConstructor(p)) {
        try {
          return new (p as ClassConstructor<T>)()
        } catch {
          return undefined as unknown as T
        }
      }
    }

    return undefined as unknown as T
  },
}

export default { TestBed }
