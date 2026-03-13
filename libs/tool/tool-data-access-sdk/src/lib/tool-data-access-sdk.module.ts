/**
 * Tool Data Access SDK Module
 * 
 * Module principal do SDK.
 * Configura providers e opcionalmente interceptors.
 * 
 * Responsabilidades:
 * - Prover configuração centralizada
 * - Registrar interceptors (se necessário)
 * - Permitir configuração via forRoot/forFeature
 * 
 * Não-responsabilidades:
 * - Implementar lógica de client (isso é client)
 * - Implementar lógica de negócio (isso é service/store da tool)
 */

import { NgModule, ModuleWithProviders, Provider } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RuntimeConfig, TOOL_DATA_ACCESS_CONFIG } from './models/runtime-config.model';
import { ObservabilityService, TOOL_DATA_ACCESS_OBSERVABILITY } from './models/observability.model';
import { correlationInterceptor } from './interceptors/correlation.interceptor';
import { contextInterceptor } from './interceptors/context.interceptor';

export interface ToolDataAccessSdkConfig {
  runtimeConfig: RuntimeConfig;
  observability?: ObservabilityService;
  enableInterceptors?: boolean;
}

@NgModule()
export class ToolDataAccessSdkModule {
  static forRoot(config: ToolDataAccessSdkConfig): ModuleWithProviders<ToolDataAccessSdkModule> {
    const providers: Provider[] = [
      {
        provide: TOOL_DATA_ACCESS_CONFIG,
        useValue: config.runtimeConfig,
      },
    ];

    if (config.observability) {
      providers.push({
        provide: TOOL_DATA_ACCESS_OBSERVABILITY,
        useValue: config.observability,
      });
    }

    if (config.enableInterceptors) {
      providers.push(
        provideHttpClient(
          withInterceptors([correlationInterceptor, contextInterceptor])
        )
      );
    }

    return {
      ngModule: ToolDataAccessSdkModule,
      providers,
    };
  }
}
