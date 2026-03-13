/**
 * HTTP Telemetry Provider — Exemplos de fornecimento de config e integração
 * 
 * Este arquivo demonstra como providenciar HTTP_TELEMETRY_CONFIG_TOKEN em diferentes cenários:
 * - Por ambiente (dev/stage/prod)
 * - Por FeatureFlags/RuntimeConfig
 * - Desabilitado (disabled)
 * 
 * LOCAL DE INTEGRAÇÃO (recomendado):
 * - Shell AppModule / main.ts
 * - Shared Infra providers
 * - Não deve estar em Tools (evita acoplamento desnecessário)
 */

import { Provider } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpTelemetryInterceptor } from './http-telemetry.interceptor';
import { HTTP_TELEMETRY_CONFIG_TOKEN, OBSERVABILITY_SERVICE_TOKEN, mergeConfig } from './http-telemetry.config';
import { HttpTelemetryConfig } from './http-telemetry.model';

/**
 * Exemplo 1: Provider padrão (sempre habilitado, com sampling por ambiente)
 * 
 * Adequado para:
 * - Aplicações que sempre desejam telemetria
 * - Ambiente-aware sampling (100% em dev, 10% em prod)
 * 
 * Uso (em AppModule ou main.ts):
 * providers: [
 *   provideHttpTelemetryDefault(observabilityService, { isProduction: true })
 * ]
 */
export function provideHttpTelemetryDefault(
  observabilityService: unknown,  // ObservabilityService
  options?: { isProduction?: boolean }
): Provider[] {
  const isProduction = options?.isProduction ?? false;
  
  return [
    {
      provide: OBSERVABILITY_SERVICE_TOKEN,
      useValue: observabilityService
    },
    {
      provide: HTTP_TELEMETRY_CONFIG_TOKEN,
      useValue: mergeConfig({
        enabled: true,
        samplingRate: isProduction ? 0.1 : 1.0,  // 100% em dev, 10% em prod
        capture4xx: !isProduction,  // capturar 4xx apenas em dev
        capture5xx: true  // sempre capturar 5xx
      })
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpTelemetryInterceptor,
      multi: true
    }
  ];
}

/**
 * Exemplo 2: Provider com FeatureFlags (recomendado para produção)
 * 
 * Adequado para:
 * - Ambientes que desejam ligar/desligar telemetria dynamicamente
 * - Orquestração de sampling por runtime-config
 * - A/B testing e dark launches
 * 
 * Dependências esperadas: FeatureFlagsService com métodos:
 *   - isEnabled(flagName: string): boolean
 *   - getConfig(flagName: string): Record<string, any>
 * 
 * Uso:
 * providers: [
 *   provideHttpTelemetryWithFeatureFlags(featureFlagsService, observabilityService)
 * ]
 */
export function provideHttpTelemetryWithFeatureFlags(
  featureFlagsService: unknown,  // FeatureFlagsService
  observabilityService: unknown  // ObservabilityService
): Provider[] {
  return [
    {
      provide: OBSERVABILITY_SERVICE_TOKEN,
      useValue: observabilityService
    },
    {
      provide: HTTP_TELEMETRY_CONFIG_TOKEN,
      useFactory: (): HttpTelemetryConfig => {
        const flags = featureFlagsService as unknown as { isEnabled?: (flag: string) => boolean; getConfig?: (flag: string) => Record<string, unknown> };
        const enabled = (typeof flags.isEnabled === 'function' ? flags.isEnabled('http-telemetry') : true) ?? true;
        const flagConfig = (typeof flags.getConfig === 'function' ? flags.getConfig('http-telemetry') : {}) || {};

        return mergeConfig({
          enabled,
          samplingRate: (flagConfig as Record<string, unknown>).samplingRate as number ?? 0.1,
          capture4xx: (flagConfig as Record<string, unknown>).capture4xx as boolean ?? false,
          capture5xx: (flagConfig as Record<string, unknown>).capture5xx as boolean ?? true,
          urlPolicy: {
            denylist: (flagConfig as Record<string, unknown>).denylist as string[] ?? ['/assets', '/health', '/healthcheck'],
            maxLength: (flagConfig as Record<string, unknown>).maxLength as number ?? 200
          }
        });
      }
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpTelemetryInterceptor,
      multi: true
    }
  ];
}

/**
 * Exemplo 3: Provider desabilitado (opt-out)
 * 
 * Adequado para:
 * - Desabilitar telemetria em testes
 * - Ambientes com restrição de dados
 * - Dark launches onde telemetria ainda não é desejada
 * 
 * Uso:
 * providers: [
 *   provideHttpTelemetryDisabled()
 * ]
 */
export function provideHttpTelemetryDisabled(): Provider[] {
  return [
    {
      provide: HTTP_TELEMETRY_CONFIG_TOKEN,
      useValue: mergeConfig({ enabled: false })
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpTelemetryInterceptor,
      multi: true
    }
  ];
}
