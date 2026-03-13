import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { ErrorCategory, ErrorCode, Severity } from '@hub/error-model';
import { FlagValidationError, buildToolFlagKey, validateFlagKey } from './feature-flag.namespace';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagsAdapter } from './feature-flag.adapters';
import { FlagKey, FlagSnapshotLite } from './feature-flag.model';

// ---------------------------------------------------------------------------
// Fake adapter — simula shared-lib feature-flags sem dependência real
// ---------------------------------------------------------------------------
class FakeAdapter implements FeatureFlagsAdapter {
  private subjects: Record<string, BehaviorSubject<boolean>> = {};
  private lastCtx: Record<string, unknown> | null = null;

  setFlag(key: string, value: boolean): void {
    if (!this.subjects[key]) {
      this.subjects[key] = new BehaviorSubject<boolean>(value);
    } else {
      this.subjects[key].next(value);
    }
  }

  isEnabled(key: FlagKey): boolean {
    return this.subjects[key]?.getValue() ?? false;
  }

  watch(key: FlagKey): Observable<boolean> {
    if (!this.subjects[key]) {
      this.subjects[key] = new BehaviorSubject<boolean>(false);
    }
    return this.subjects[key].asObservable();
  }

  snapshot(): FlagSnapshotLite {
    const flags: Record<string, { enabled: boolean }> = {};
    for (const k of Object.keys(this.subjects)) {
      flags[k] = { enabled: this.subjects[k].getValue() };
    }
    return { flags, version: 1, timestamp: Date.now() };
  }

  setContextSync(ctx: Record<string, unknown>): void {
    this.lastCtx = ctx;
  }

  explain(key: FlagKey) {
    const enabled = this.isEnabled(key);
    return {
      key,
      enabled,
      source: 'default' as const,
      reason: 'Set via FakeAdapter for testing',
      metadata: { timestamp: Date.now() },
    };
  }

  getLastContext(): Record<string, unknown> | null {
    return this.lastCtx;
  }
}

// ---------------------------------------------------------------------------
// FlagValidationError — integração com error-model
// ---------------------------------------------------------------------------
describe('FlagValidationError', () => {
  it('carries ErrorCategory.FLAGS', () => {
    const err = new FlagValidationError('MissingFlagKey', 'test');
    expect(err.category).toBe(ErrorCategory.FLAGS);
  });

  it('carries ErrorCode.VALIDATION_ERROR', () => {
    const err = new FlagValidationError('InvalidNamespace', 'test');
    expect(err.errorCode).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('carries Severity.WARNING', () => {
    const err = new FlagValidationError('MissingFlagKey', 'test');
    expect(err.severity).toBe(Severity.WARNING);
  });

  it('is an instanceof Error', () => {
    const err = new FlagValidationError('MissingFlagKey', 'test');
    expect(err).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// buildToolFlagKey
// ---------------------------------------------------------------------------
describe('buildToolFlagKey', () => {
  it('builds "toolKey.featureKey"', () => {
    expect(buildToolFlagKey('toolA', 'export')).toBe('toolA.export');
    expect(buildToolFlagKey('global', 'beta')).toBe('global.beta');
  });

  it('throws MissingFlagKey for empty toolKey', () => {
    expect(() => buildToolFlagKey('', 'export')).toThrow(FlagValidationError);
    try {
      buildToolFlagKey('', 'export');
    } catch (e) {
      expect((e as FlagValidationError).code).toBe('MissingFlagKey');
    }
  });

  it('throws MissingFlagKey for empty featureKey', () => {
    expect(() => buildToolFlagKey('toolA', '')).toThrow(FlagValidationError);
  });

  it('throws InvalidNamespace when toolKey contains a dot', () => {
    try {
      buildToolFlagKey('tool.A', 'export');
      fail('Expected FlagValidationError');
    } catch (e) {
      expect(e).toBeInstanceOf(FlagValidationError);
      expect((e as FlagValidationError).code).toBe('InvalidNamespace');
    }
  });

  it('throws InvalidNamespace when featureKey contains a dot', () => {
    try {
      buildToolFlagKey('toolA', 'feat.v2');
      fail('Expected FlagValidationError');
    } catch (e) {
      expect(e).toBeInstanceOf(FlagValidationError);
      expect((e as FlagValidationError).code).toBe('InvalidNamespace');
    }
  });
});

// ---------------------------------------------------------------------------
// validateFlagKey
// ---------------------------------------------------------------------------
describe('validateFlagKey', () => {
  it('passes for valid keys', () => {
    expect(() => validateFlagKey('global.dashboard')).not.toThrow();
    expect(() => validateFlagKey('toolA.export')).not.toThrow();
    expect(() => validateFlagKey('nav.sidebar-v2')).not.toThrow();
  });

  it('throws MissingFlagKey for empty key', () => {
    try {
      validateFlagKey('');
    } catch (e) {
      expect(e).toBeInstanceOf(FlagValidationError);
      expect((e as FlagValidationError).code).toBe('MissingFlagKey');
    }
  });

  it('throws InvalidNamespace for key without dot', () => {
    try {
      validateFlagKey('nodot');
    } catch (e) {
      expect(e).toBeInstanceOf(FlagValidationError);
      expect((e as FlagValidationError).code).toBe('InvalidNamespace');
    }
  });

  it('throws InvalidNamespace for key with multiple dots', () => {
    try {
      validateFlagKey('a.b.c');
    } catch (e) {
      expect(e).toBeInstanceOf(FlagValidationError);
      expect((e as FlagValidationError).code).toBe('InvalidNamespace');
    }
  });
});

// ---------------------------------------------------------------------------
// FeatureFlagService
// ---------------------------------------------------------------------------
describe('FeatureFlagService', () => {
  let adapter: FakeAdapter;
  let contextInvalidation$: Subject<void>;
  let service: FeatureFlagService;

  beforeEach(() => {
    adapter = new FakeAdapter();
    contextInvalidation$ = new Subject<void>();
    service = new FeatureFlagService(
      adapter,
      contextInvalidation$.asObservable(),
      () => ({ tenantId: 'acme' })
    );
  });

  afterEach(() => {
    service.destroy();
  });

  describe('isEnabled', () => {
    it('returns false for unknown flag', () => {
      expect(service.isEnabled('global.unknown')).toBe(false);
    });

    it('returns true when flag is enabled in adapter', () => {
      adapter.setFlag('global.dashboard', true);
      expect(service.isEnabled('global.dashboard')).toBe(true);
    });

    it('throws FlagValidationError for empty key', () => {
      expect(() => service.isEnabled('')).toThrow(FlagValidationError);
    });

    it('throws FlagValidationError for invalid key format', () => {
      expect(() => service.isEnabled('no-dot')).toThrow(FlagValidationError);
    });
  });

  describe('watch', () => {
    it('emits current value immediately', (done) => {
      adapter.setFlag('global.beta', true);
      service.watch('global.beta').subscribe((v) => {
        expect(v).toBe(true);
        done();
      });
    });

    it('emits updated value when flag changes', (done) => {
      adapter.setFlag('global.beta', false);
      const values: boolean[] = [];

      service.watch('global.beta').subscribe((v) => {
        values.push(v);
        if (values.length === 2) {
          expect(values).toEqual([false, true]);
          done();
        }
      });

      adapter.setFlag('global.beta', true);
    });

    it('throws FlagValidationError for invalid key', () => {
      expect(() => service.watch('invalid')).toThrow(FlagValidationError);
    });
  });

  describe('snapshot', () => {
    it('returns flags in lite format', () => {
      adapter.setFlag('global.dashboard', true);
      const snap = service.snapshot();
      expect(snap.flags['global.dashboard']).toEqual({ enabled: true });
    });

    it('returns a copy — property reassignment does not affect internal state', () => {
      adapter.setFlag('global.dashboard', true);
      const snap1 = service.snapshot();

      (snap1.flags as Record<string, unknown>)['global.dashboard'] = { enabled: false };

      const snap2 = service.snapshot();
      expect(snap2.flags['global.dashboard']).toEqual({ enabled: true });
    });

    it('returns a deep copy — mutating enabled on a returned item does not affect internal state', () => {
      adapter.setFlag('global.dashboard', true);
      const snap1 = service.snapshot();

      // Deep mutation of the FlagStateLite object itself
      (snap1.flags['global.dashboard'] as { enabled: boolean }).enabled = false;

      const snap2 = service.snapshot();
      expect(snap2.flags['global.dashboard']).toEqual({ enabled: true });
    });
  });

  describe('context change recompute', () => {
    it('calls setContextSync on adapter when context invalidation fires', () => {
      contextInvalidation$.next();
      expect(adapter.getLastContext()).toEqual({ tenantId: 'acme' });
    });

    it('calls setContextSync exactly once per invalidation event', () => {
      const spy = jest.spyOn(adapter, 'setContextSync');
      contextInvalidation$.next();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does not call setContextSync when contextSnapshotFn returns null', () => {
      const adapterNull = new FakeAdapter();
      const inv$ = new Subject<void>();
      const svc = new FeatureFlagService(adapterNull, inv$.asObservable(), () => null);

      const spy = jest.spyOn(adapterNull, 'setContextSync');
      inv$.next();
      expect(spy).not.toHaveBeenCalled();
      svc.destroy();
    });
  });

  describe('tool(toolKey)', () => {
    it('checks toolKey.featureKey via isEnabled', () => {
      adapter.setFlag('toolA.export', true);
      expect(service.tool('toolA').isEnabled('export')).toBe(true);
    });

    it('returns false for disabled tool flag', () => {
      adapter.setFlag('toolA.export', false);
      expect(service.tool('toolA').isEnabled('export')).toBe(false);
    });

    it('emits via tool().watch when flag changes', (done) => {
      adapter.setFlag('toolA.export', false);

      service.tool('toolA').watch('export').subscribe((v) => {
        if (v === true) done();
      });

      adapter.setFlag('toolA.export', true);
    });

    it('provides explain() helper', () => {
      adapter.setFlag('toolA.export', true);
      const explanation = service.tool('toolA').explain('export');
      expect(explanation).toBeTruthy();
      expect(explanation?.key).toBe('toolA.export');
      expect(explanation?.enabled).toBe(true);
      expect(explanation?.source).toBe('default');
    });
  });

  describe('explain()', () => {
    it('returns explanation for valid flag key', () => {
      adapter.setFlag('global.dashboard', true);
      const explanation = service.explain('global.dashboard');
      expect(explanation).toBeTruthy();
      expect(explanation?.key).toBe('global.dashboard');
      expect(explanation?.enabled).toBe(true);
      expect(explanation?.source).toBe('default');
    });

    it('throws FlagValidationError for invalid key', () => {
      expect(() => service.explain('invalid')).toThrow(FlagValidationError);
    });

    it('returns null when adapter does not support explain', () => {
      // Create adapter without explain method
      const minimalAdapter: FeatureFlagsAdapter = {
        isEnabled: () => false,
        watch: () => new BehaviorSubject(false).asObservable(),
        snapshot: () => ({ flags: {}, version: 1, timestamp: Date.now() }),
        setContextSync: () => {
          // No-op for minimal adapter
        },
      };

      const minimalService = new FeatureFlagService(minimalAdapter);
      expect(minimalService.explain('global.test')).toBeNull();
      minimalService.destroy();
    });
  });
});
