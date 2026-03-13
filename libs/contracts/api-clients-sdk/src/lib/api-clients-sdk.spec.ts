import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiClientsSdkModule } from './api-clients-sdk.module';
import { HubClient } from './clients/hub.client';
import { ToolsClient } from './clients/tools.client';
import { StandardError } from '@hub/error-model';
import { RUNTIME_CONFIG } from './runtime-config.token';

describe('ApiClientsSdk - HubClient', () => {
  let httpMock: HttpTestingController;
  let hubClient: HubClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ApiClientsSdkModule.forRoot({ runtimeConfig: { baseUrl: 'http://localhost' } })],
    });
    httpMock = TestBed.inject(HttpTestingController);
    hubClient = TestBed.inject(HubClient);
    // ToolsClient registered by module providers
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const toolsClient = TestBed.inject(ToolsClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch project and map DTO', (done) => {
    const mock = { id: 'p1', name: 'Proj 1' };
    hubClient.getProject('p1').subscribe((res) => {
      expect(res.id).toBe('p1');
      expect(res.name).toBe('Proj 1');
      done();
    });
    const req = httpMock.expectOne('http://localhost/projects/p1');
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('should map HTTP error to StandardError', (done) => {
    hubClient.getProject('p1').subscribe({
      next: () => fail('should not succeed'),
      error: (err: StandardError) => {
        try {
          expect(err).toBeTruthy();
          expect(err.category).toBeTruthy();
          expect(err.code).toBeTruthy();
          done();
        } catch (e) {
          done(e);
        }
      },
    });

    const req = httpMock.expectOne('http://localhost/projects/p1');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
  });

  it('should list projects with query params', (done) => {
    const mock = [{ id: 'p1', name: 'Proj 1' }];
    hubClient.listProjects({ page: 2, pageSize: 5 }).subscribe((res) => {
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
      done();
    });
    const req = httpMock.expectOne((r) => r.url === 'http://localhost/projects');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('5');
    req.flush(mock);
  });

  it('should list tools via ToolsClient', (done) => {
    const tools = [{ id: 't1', key: 'tool-1', title: 'Tool 1' }];
    const toolsClient = TestBed.inject(ToolsClient);
    toolsClient.listTools().subscribe((res) => {
      expect(res.length).toBe(1);
      expect(res[0].key).toBe('tool-1');
      done();
    });
    const req = httpMock.expectOne('http://localhost/tools');
    expect(req.request.method).toBe('GET');
    req.flush(tools);
  });

  it('should expose RUNTIME_CONFIG provider from forRoot', () => {
    const cfg = TestBed.inject(RUNTIME_CONFIG) as unknown as { baseUrl?: string };
    expect(cfg).toBeTruthy();
    expect(cfg.baseUrl).toBe('http://localhost');
  });
});
