import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  baseUrl: string;
  apiVersion?: string;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');
