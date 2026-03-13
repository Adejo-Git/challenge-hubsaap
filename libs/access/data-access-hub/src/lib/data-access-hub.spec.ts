import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';
import { DataAccessHubService } from './data-access-hub.service';
import { HubClient } from '@hub/api-clients-sdk';
import { StandardError } from '@hub/error-model';
import { CONTEXT_SERVICE_TOKEN } from '@hub/tool-data-access-sdk';

describe('DataAccessHubService', () => {
  let service: DataAccessHubService;
  let mockHubClient: Partial<HubClient> & { listProjects: jest.Mock };

  beforeEach(() => {
    mockHubClient = { listProjects: jest.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: HubClient, useValue: mockHubClient }, DataAccessHubService],
    });
    service = TestBed.inject(DataAccessHubService);
  });

  it('should invalidate and reload on context invalidation', (done) => {
    const projectsA = [{ id: 'p1', name: 'P1' }];
    const projectsB = [{ id: 'p2', name: 'P2' }];
    const invalidation$ = new Subject<void>();
    mockHubClient.listProjects
      .mockReturnValueOnce(of(projectsA))
      .mockReturnValueOnce(of(projectsB));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: HubClient, useValue: mockHubClient },
        DataAccessHubService,
        { provide: CONTEXT_SERVICE_TOKEN, useValue: { contextInvalidation$: () => invalidation$.asObservable(), snapshot: () => null } },
      ],
    });
    service = TestBed.inject(DataAccessHubService);

    service.loadCatalog().subscribe(() => {
      // trigger invalidation
      invalidation$.next();
      setTimeout(() => {
        expect(mockHubClient.listProjects).toHaveBeenCalledTimes(2);
        done();
      }, 10);
    });
  });

  it('should load catalog and cache it', (done) => {
    const projects = [{ id: 'p1', name: 'P1' }];
    mockHubClient.listProjects.mockReturnValue(of(projects));

    service.loadCatalog().subscribe((res) => {
      expect(res.length).toBe(1);
      expect(service.getCachedCatalog()).toBeTruthy();
      // calling again without force should not call client again
      service.loadCatalog().subscribe(() => {
        expect(mockHubClient.listProjects).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  it('should reload when force=true', (done) => {
    const projectsA = [{ id: 'p1', name: 'P1' }];
    const projectsB = [{ id: 'p2', name: 'P2' }];
    mockHubClient.listProjects
      .mockReturnValueOnce(of(projectsA))
      .mockReturnValueOnce(of(projectsB));

    service.loadCatalog().subscribe(() => {
      service.loadCatalog(true).subscribe((res) => {
        expect(res[0].id).toBe('p2');
        done();
      });
    });
  });

  it('should propagate StandardError from client', (done) => {
    const err: StandardError = {
      category: 'HTTP' as unknown as StandardError['category'],
      code: 'HTTP_SERVER_ERROR',
      severity: 'error' as unknown as StandardError['severity'],
      userMessage: 'erro',
      timestamp: new Date().toISOString(),
    };
    mockHubClient.listProjects.mockReturnValue(throwError(() => err));

    service.loadCatalog().subscribe({
      next: () => fail('should not succeed'),
      error: (e: unknown) => {
        expect(e).toBe(err);
        done();
      },
    });
  });

  it('should expire cache after TTL and reload from client', (done) => {
    const projectsA = [{ id: 'p1', name: 'P1' }];
    const projectsB = [{ id: 'p2', name: 'P2' }];
    mockHubClient.listProjects
      .mockReturnValueOnce(of(projectsA))
      .mockReturnValueOnce(of(projectsB));

    // shorten TTL for test reliability
    service.setCacheTtl(10);

    service.loadCatalog().subscribe(() => {
      expect(service.getCachedCatalog()).toBeTruthy();
      // wait for TTL to expire
      setTimeout(() => {
        expect(service.getCachedCatalog()).toBeNull();
        // subsequent load should call client again and return projectsB
        service.loadCatalog().subscribe((res) => {
          expect(res[0].id).toBe('p2');
          done();
        });
      }, 25);
    });
  });
});
