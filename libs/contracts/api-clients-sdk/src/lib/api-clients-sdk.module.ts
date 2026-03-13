import { ModuleWithProviders, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ApiClientBase } from './api-client.base';
import { HubClient } from './clients/hub.client';
import { ToolsClient } from './clients/tools.client';
import { HttpBaseModule } from '@hub/http-base';
import { RuntimeConfig, RUNTIME_CONFIG } from './runtime-config.token';

export interface ApiClientsSdkModuleConfig {
  runtimeConfig: RuntimeConfig;
}

@NgModule({
  imports: [HttpClientModule, HttpBaseModule],
  providers: [ApiClientBase, HubClient, ToolsClient],
})
export class ApiClientsSdkModule {
  static forRoot(config: ApiClientsSdkModuleConfig): ModuleWithProviders<ApiClientsSdkModule> {
    // NOTE: Apps should also call HttpBaseModule.forRoot(...) at AppModule level to register interceptors.
    return {
      ngModule: ApiClientsSdkModule,
      providers: [{ provide: RUNTIME_CONFIG, useValue: config.runtimeConfig }],
    };
  }
}
