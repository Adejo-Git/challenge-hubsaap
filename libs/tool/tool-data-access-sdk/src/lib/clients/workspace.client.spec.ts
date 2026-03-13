/**
 * Testes: Workspace Client
 * 
 * Valida chamadas HTTP usando HttpTestingController.
 * Testa success e error mapping.
 */

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { WorkspaceClient } from './workspace.client';
import { TOOL_DATA_ACCESS_CONFIG } from '../models/runtime-config.model';
import { TOOL_DATA_ACCESS_OBSERVABILITY } from '../models/observability.model';
import { WorkspaceDto, CreateWorkspaceRequest } from '../models/dto.model';
import { ToolDataError, ErrorCategory } from '../errors/tool-data-error.model';

describe('WorkspaceClient', () => {
  let client: WorkspaceClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WorkspaceClient,
        {
          provide: TOOL_DATA_ACCESS_CONFIG,
          useValue: { baseUrl: 'http://localhost:3000/api' },
        },
        {
          provide: TOOL_DATA_ACCESS_OBSERVABILITY,
          useValue: {
            track: jest.fn(),
            trackError: jest.fn(),
          },
        },
      ],
    });

    client = TestBed.inject(WorkspaceClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getWorkspace', () => {
    it('deve buscar workspace por ID com sucesso', (done) => {
      const mockWorkspace: WorkspaceDto = {
        id: 'ws-1',
        name: 'Workspace Teste',
        tenantId: 'tenant-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      client.getWorkspace('ws-1').subscribe({
        next: (workspace) => {
          expect(workspace).toEqual(mockWorkspace);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne('http://localhost:3000/api/workspaces/ws-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockWorkspace);
    });

    it('deve mapear erro 404 para ToolDataError', (done) => {
      client.getWorkspace('ws-999').subscribe({
        next: () => done.fail('Deveria ter falhado'),
        error: (error) => {
          expect(error).toBeInstanceOf(ToolDataError);
          expect(error.category).toBe(ErrorCategory.NotFound);
          expect(error.code).toBe('HTTP_404');
          done();
        },
      });

      const req = httpMock.expectOne('http://localhost:3000/api/workspaces/ws-999');
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createWorkspace', () => {
    it('deve criar workspace com sucesso', (done) => {
      const request: CreateWorkspaceRequest = {
        name: 'Novo Workspace',
        tenantId: 'tenant-1',
      };

      const mockResponse: WorkspaceDto = {
        id: 'ws-2',
        name: 'Novo Workspace',
        tenantId: 'tenant-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      client.createWorkspace(request).subscribe({
        next: (workspace) => {
          expect(workspace).toEqual(mockResponse);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne('http://localhost:3000/api/workspaces');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('deve mapear erro 400 para ToolDataError de validação', (done) => {
      const request: CreateWorkspaceRequest = {
        name: '',
        tenantId: 'tenant-1',
      };

      client.createWorkspace(request).subscribe({
        next: () => done.fail('Deveria ter falhado'),
        error: (error) => {
          expect(error).toBeInstanceOf(ToolDataError);
          expect(error.category).toBe(ErrorCategory.Validation);
          expect(error.code).toBe('HTTP_400');
          done();
        },
      });

      const req = httpMock.expectOne('http://localhost:3000/api/workspaces');
      req.flush(
        { message: 'Nome é obrigatório' },
        { status: 400, statusText: 'Bad Request' }
      );
    });
  });

  describe('listWorkspaces', () => {
    it('deve listar workspaces com paginação', (done) => {
      const mockResponse = {
        items: [
          {
            id: 'ws-1',
            name: 'Workspace 1',
            tenantId: 'tenant-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      };

      client.listWorkspaces({ page: 1, pageSize: 10 }).subscribe({
        next: (response) => {
          expect(response.items).toHaveLength(1);
          expect(response.total).toBe(1);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne((r: HttpRequest<unknown>) => r.url === 'http://localhost:3000/api/workspaces');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });
});
