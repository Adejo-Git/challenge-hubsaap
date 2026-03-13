import { ObservabilityProvider } from './observability.provider';
import { ConsoleProvider } from './providers/console.provider';
import { SentryProvider } from './providers/sentry.provider';
import { AzureMonitorProvider } from './providers/azure-monitor.provider';
import { ElkOtelProvider } from './providers/elk-otel.provider';

export interface ObservabilityRuntimeConfig {
  enabled?: boolean;
  samplingRate?: number; // 0-1
  provider?: 'console' | 'sentry' | 'azure' | 'elk';
  providerOptions?: Record<string, unknown>;
}

export const DEFAULT_CONFIG: ObservabilityRuntimeConfig = {
  enabled: true,
  samplingRate: 1,
  provider: 'console',
  providerOptions: {},
};

declare global {
  interface Window {
    HUBSAAP_RUNTIME_OBSERVABILITY?: ObservabilityRuntimeConfig;
  }
}

export function getRuntimeConfig(): ObservabilityRuntimeConfig {
  try {
    return { ...DEFAULT_CONFIG, ...(window.HUBSAAP_RUNTIME_OBSERVABILITY || {}) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function createProviderFromConfig(cfg: ObservabilityRuntimeConfig): ObservabilityProvider {
  const providerKey = cfg.provider || 'console';
  switch (providerKey) {
    case 'console':
      return new ConsoleProvider();
    case 'sentry':
      return new SentryProvider(cfg.providerOptions);
    case 'azure':
      return new AzureMonitorProvider(cfg.providerOptions);
    case 'elk':
      return new ElkOtelProvider(cfg.providerOptions);
    default:
      return new ConsoleProvider();
  }
}
