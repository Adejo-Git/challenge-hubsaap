/**
 * Testes: Tool Data Access SDK Module
 * 
 * Valida configuração do module.
 */

import { TestBed } from '@angular/core/testing';
import { ToolDataAccessSdkModule } from './tool-data-access-sdk.module';
import { TOOL_DATA_ACCESS_CONFIG } from './models/runtime-config.model';
import { TOOL_DATA_ACCESS_OBSERVABILITY } from './models/observability.model';

describe('ToolDataAccessSdkModule', () => {
  it('deve configurar providers corretamente com forRoot', () => {
    const mockConfig = {
      baseUrl: 'http://localhost:3000/api',
      timeout: 30000,
    };

    const mockObservability = {
      track: jest.fn(),
      trackError: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [
        ToolDataAccessSdkModule.forRoot({
          runtimeConfig: mockConfig,
          observability: mockObservability,
        }),
      ],
    });

    const config = TestBed.inject(TOOL_DATA_ACCESS_CONFIG);
    const observability = TestBed.inject(TOOL_DATA_ACCESS_OBSERVABILITY);

    expect(config).toEqual(mockConfig);
    expect(observability).toEqual(mockObservability);
  });

  it('deve funcionar sem observability (opcional)', () => {
    const mockConfig = {
      baseUrl: 'http://localhost:3000/api',
    };

    TestBed.configureTestingModule({
      imports: [
        ToolDataAccessSdkModule.forRoot({
          runtimeConfig: mockConfig,
        }),
      ],
    });

    const config = TestBed.inject(TOOL_DATA_ACCESS_CONFIG);
    expect(config).toEqual(mockConfig);
  });
});
