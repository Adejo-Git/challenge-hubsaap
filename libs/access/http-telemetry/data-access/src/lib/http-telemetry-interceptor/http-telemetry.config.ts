import { InjectionToken } from '@angular/core';
import { DEFAULT_HTTP_TELEMETRY_CONFIG, HttpTelemetryConfig, ObservabilityService } from './http-telemetry.model';

/**
 * Mescla configuração padrão com overrides, respeitando estrutura de urlPolicy.
 * Uso recomendado em providers para combinar defaults com FeatureFlags/RuntimeConfig.
 */
export function mergeConfig(override?: Partial<HttpTelemetryConfig>): HttpTelemetryConfig {
  if (!override) {
    return { ...DEFAULT_HTTP_TELEMETRY_CONFIG };
  }
  return {
    ...DEFAULT_HTTP_TELEMETRY_CONFIG,
    ...override,
    urlPolicy: {
      ...DEFAULT_HTTP_TELEMETRY_CONFIG.urlPolicy,
      ...(override.urlPolicy || {})
    }
  };
}

/**
 * InjectionToken para HttpTelemetryConfig — Contrato de Configuração
 * 
 * RESPONSABILIDADE: Definir como HTTP telemetry é habilitada, com sampling, filtros por ambiente.
 * 
 * EXEMPLOS DE PROVIDÊNCIA:
 * 
 * 1) Padrão (sempre habilitado, produção):
 *    provide: HTTP_TELEMETRY_CONFIG_TOKEN,
 *    useValue: mergeConfig({ samplingRate: 0.1, capture5xx: true })
 * 
 * 2) Por FeatureFlags/RuntimeConfig (recomendado para produção):
 *    provide: HTTP_TELEMETRY_CONFIG_TOKEN,
 *    useFactory: (featureFlags: FeatureFlagsService) => {
 *      const enabled = featureFlags.isEnabled('http-telemetry');
 *      const samplingRate = featureFlags.getConfig('http-telemetry').samplingRate ?? 0.1;
 *      return mergeConfig({ enabled, samplingRate });
 *    },
 *    deps: [FeatureFlagsService]
 * 
 * 3) Por ambiente (dev/stage/prod):
 *    provide: HTTP_TELEMETRY_CONFIG_TOKEN,
 *    useFactory: () => {
 *      const env = environment.production;
 *      return mergeConfig({ 
 *        enabled: true, 
 *        samplingRate: env ? 0.1 : 1.0,  // 100% em dev, 10% em prod
 *        capture4xx: !env  // capturar 4xx apenas em dev
 *      });
 *    }
 * 
 * DEFAULT: { enabled: true, samplingRate: 0.1, denylist: ['/assets', ...], ...}
 * 
 * @see HttpTelemetryInterceptor — consome este token
 * @see DEFAULT_HTTP_TELEMETRY_CONFIG — valores padrão
 */
export const HTTP_TELEMETRY_CONFIG_TOKEN = new InjectionToken<HttpTelemetryConfig>(
  'HTTP_TELEMETRY_CONFIG_TOKEN',
  {
    providedIn: 'root',
    factory: () => mergeConfig()  // default: sempre habilitado se ninguém providenciar
  }
);

/**
 * InjectionToken para ObservabilityService.
 * 
 * Fornece: getCorrelationId(), addBreadcrumb(), trackEvent(), captureException()
 * 
 * RESPONSABILIDADE: Abstrair provider de observabilidade (Sentry, DataDog, etc).
 * 
 * Exemplo de providência:
 *   provide: OBSERVABILITY_SERVICE_TOKEN,
 *   useValue: injector.get(ObservabilityService)  // compartilhado com app
 */
export const OBSERVABILITY_SERVICE_TOKEN = new InjectionToken<ObservabilityService>(
  'OBSERVABILITY_SERVICE_TOKEN'
);

/**
 * InjectionToken para função de sampling customizado (opcional).
 * 
 * Função que retorna valor entre 0 e 1 para sampling probabilístico.
 * Usado para testes e controle fino de sampling por contexto.
 * 
 * Exemplo:
 *   provide: HTTP_TELEMETRY_SAMPLER_TOKEN,
 *   useValue: () => Math.random()
 */
export const HTTP_TELEMETRY_SAMPLER_TOKEN = new InjectionToken<() => number>(
  'HTTP_TELEMETRY_SAMPLER_TOKEN'
);
