import { Injectable } from '@angular/core';
import { Observable, of, delay, Subject } from 'rxjs';

export interface AppContext {
  tenantId: string;
  tenantName: string;
  clienteId: string | null;
  clienteName: string | null;
  projetoId: string | null;
  projetoName: string | null;
  environment: 'dev' | 'staging' | 'production';
}

/**
 * ContextLite - vers\u00e3o simplificada do contexto
 */
export interface ContextLite {
  tenantId?: string;
  clientId?: string;
  projectId?: string;
  environmentKey?: string;
}

/**
 * ContextServiceMock
 * 
 * Mock do ContextService da Access Layer.
 * Simula a restauração de contexto e mudanças reativas.
 * 
 * TODO: Substituir por @hub/access-layer/context quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class ContextServiceMock {
  private contextChangeSubject = new Subject<AppContext>();
  private currentContext: AppContext = {
    tenantId: 'tenant-001',
    tenantName: 'Empresa Demo',
    clienteId: 'cliente-abc',
    clienteName: 'Cliente Alpha',
    projetoId: 'projeto-xyz',
    projetoName: 'Projeto Beta',
    environment: 'dev' as const,
  };

  /**
   * Stream de mudanças de contexto.
   * Emite quando o usuário troca tenant/cliente/projeto.
   */
  readonly contextChange$ = this.contextChangeSubject.asObservable();

   /**
    * Observable do contexto atual
    */
  // Expose context$ as a proper Observable to match Access Layer contract.
  readonly context$: Observable<AppContext> = this.contextChangeSubject.asObservable();

  constructor() {
    // no-op. Keeping constructor minimal; consumers/tests should use jest.spyOn on methods instead of callable property hacks.
  }

  /**
   * Simula a restauração do contexto do storage.
   */
  restoreFromStorage(): Promise<void> {
    // Simula delay de rede (400ms)
    return new Promise((resolve) => {
      setTimeout(() => {
        this.contextChangeSubject.next(this.currentContext);
        resolve();
      }, 400);
    });
  }

  /**
   * Retorna snapshot do contexto atual
   */
  snapshot(): AppContext {
    return this.currentContext;
  }

  /**
   * Simula a restauração do contexto ativo.
   * Retorna contexto mockado com tenant/cliente/projeto.
   */
  restoreContext(): Observable<AppContext> {
    const mockContext: AppContext = {
      tenantId: 'tenant-001',
      tenantName: 'Empresa Demo',
      clienteId: 'cliente-abc',
      clienteName: 'Cliente Alpha',
      projetoId: 'projeto-xyz',
      projetoName: 'Projeto Beta',
      environment: 'dev' as const,
    };

    // Simula delay de rede (400ms)
    return of(mockContext).pipe(delay(400));
  }

  /**
   * Simula troca de contexto (ex: mudar de tenant).
   */
  switchContext(newContext: Partial<AppContext>): Observable<AppContext> {
    // Normalize environment robustly — cast to string first to avoid TS comparing incompatible string literal types.
    const rawEnv = String(newContext.environment ?? '');
    const normalizedEnv = rawEnv === 'prod' ? 'production' : (rawEnv === 'production' || rawEnv === 'dev' || rawEnv === 'staging' ? rawEnv : 'dev');
    const updatedContext: AppContext = {
      tenantId: newContext.tenantId || 'tenant-001',
      tenantName: newContext.tenantName || 'Empresa Demo',
      clienteId: newContext.clienteId || null,
      clienteName: newContext.clienteName || null,
      projetoId: newContext.projetoId || null,
      projetoName: newContext.projetoName || null,
      environment: normalizedEnv as AppContext['environment'],
    };

    // Emite mudança no stream
    setTimeout(() => {
      this.contextChangeSubject.next(updatedContext);
    }, 200);

    return of(updatedContext).pipe(delay(200));
  }
}
