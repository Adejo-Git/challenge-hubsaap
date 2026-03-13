import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * FeatureFlagServiceMock
 * 
 * Mock do FeatureFlagService da Access Layer.
 * Simula flags de feature por contexto/ambiente.
 * API alinhada com FeatureFlagService real: isEnabled/watch/snapshot/tool
 * 
 * TODO: Substituir por @hub/access-layer/feature-flags quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class FeatureFlagServiceMock {
  private readonly flags: Map<string, boolean> = new Map([
    ['global.dashboard', true],
    ['global.analytics', true],
    ['global.settings', true],
    ['global.admin-panel', false], // Desabilitada
    ['global.experimental-feature', false],
  ]);

  /**
   * Verifica se a flag está habilitada (formato: "namespace.featureName")
   */
  isEnabled(key: string): boolean {
    return this.flags.get(key) ?? false;
  }

  /**
   * Observable que emite sempre que o valor da flag muda
   */
  watch(key: string): Observable<boolean> {
    return of(this.flags.get(key) ?? false);
  }

  /**
   * Retorna snapshot seguro das flags efetivas
   */
  snapshot() {
    const flagsObj: Record<string, { enabled: boolean }> = {};
    this.flags.forEach((enabled, key) => {
      flagsObj[key] = { enabled };
    });
    return {
      flags: flagsObj,
      version: 1,
      timestamp: Date.now(),
    };
  }

  /**
   * Helper de ergonomia para flags de tool específica
   */
  tool(toolKey: string) {
    return {
      isEnabled: (featureKey: string): boolean => {
        return this.isEnabled(`${toolKey}.${featureKey}`);
      },
      watch: (featureKey: string): Observable<boolean> => {
        return this.watch(`${toolKey}.${featureKey}`);
      },
    };
  }

  // -------------------------------------------------------------------
  // DEPRECATED: Aliases para compatibilidade temporária
  // -------------------------------------------------------------------

  /** @deprecated Use isEnabled() com formato "toolKey.featureName" */
  isToolEnabled(toolKey: string): boolean {
    // Fallback: procura por qualquer flag que comece com toolKey
    for (const [key, enabled] of this.flags.entries()) {
      if (key.startsWith(`${toolKey}.`) && enabled) {
        return true;
      }
    }
    return false;
  }

  /** @deprecated Use isEnabled() com formato "namespace.featureName" */
  isFeatureEnabled(featureKey: string): boolean {
    // Fallback: procura por global.featureKey ou featureKey direto
    // Ensure correct precedence between || and ?? by grouping the fallback
    return this.isEnabled(`global.${featureKey}`) || (this.flags.get(featureKey) ?? false);
  }

  /** @deprecated Use snapshot() para obter estado atual das flags */
  getActiveFlags(): Observable<string[]> {
    const active = Array.from(this.flags.entries())
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
    return of(active);
  }

  /**
   * Simula mudança de contexto que pode alterar flags
   */
  updateContext(tenantId: string, environment: string): void {
    console.log(`[FeatureFlag] Context updated: tenant=${tenantId}, env=${environment}`);
    // Em produção: recarregar flags do backend baseado no contexto
  }
}
