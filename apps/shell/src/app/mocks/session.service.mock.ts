import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface Session {
  user: User;
  token: string;
  expiresAt: Date;
}

/**
 * SessionServiceMock
 * 
 * Mock do SessionService da Access Layer.
 * Simula a restauração de sessão com delay para emular comportamento real.
 * 
 * TODO: Substituir por @hub/access-layer/session quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class SessionServiceMock {
  private currentSession: Session | null = null;
  private authenticated = false;
  private mockSnapshot = {
    authenticated: false as boolean,
    status: 'unauthenticated' as 'authenticated' | 'unauthenticated' | 'expired',
    user: null as User | null,
    claims: null,
    exp: 0,
  };

  /**
   * Simula a restauração de uma sessão ativa.
   * Retorna dados mockados de usuário e token.
   */
  restore(): Promise<typeof this.mockSnapshot> {
    const mockSession: Session = {
      user: {
        id: 'user-123',
        name: 'Maria Silva',
        email: 'maria.silva@example.com',
        roles: ['admin', 'user'],
      },
      token: 'mock-jwt-token-abc123',
      expiresAt: new Date(Date.now() + 3600000), // 1 hora
    };

    this.currentSession = mockSession;
    this.authenticated = true;
    this.mockSnapshot = {
      authenticated: true,
      status: 'authenticated',
      user: mockSession.user,
      claims: null,
      exp: Date.now() / 1000 + 3600,
    };

    // Simula delay de rede (300ms)
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.mockSnapshot), 300);
    });
  }

  /**
   * Retorna snapshot da sessão atual
   */
  snapshot(): typeof this.mockSnapshot {
    return this.mockSnapshot;
  }

  /**
   * Simula a restauração de uma sessão ativa (deprecated - usar restore).
   * Retorna dados mockados de usuário e token.
   */
  restoreSession(): Observable<Session> {
    const mockSession: Session = {
      user: {
        id: 'user-123',
        name: 'Maria Silva',
        email: 'maria.silva@example.com',
        roles: ['admin', 'user'],
      },
      token: 'mock-jwt-token-abc123',
      expiresAt: new Date(Date.now() + 3600000), // 1 hora
    };

    this.currentSession = mockSession;

    // Simula delay de rede (300ms)
    return of(mockSession).pipe(delay(300));
  }

  /**
   * Verifica se há uma sessão autenticada ativa
   */
  isAuthenticated(): boolean {
    // Mock: verifica localStorage por compatibilidade com testes
    const hasToken = !!localStorage.getItem('auth_token');
    const hasSession = this.currentSession !== null;

    return hasToken || hasSession;
  }

  /**
   * Retorna sessão atual (se existir)
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Retorna o token de acesso atual (se houver).
   * Testes usam este helper (getAccessToken) — adicionamos para compatibilidade com os specs.
   */
  getAccessToken(): string | null {
    if (this.currentSession && this.currentSession.token) {
      return this.currentSession.token;
    }
    return localStorage.getItem('auth_token');
  }

  /**
   * Simula logout (limpa sessão).
   */
  logout(): Observable<void> {
    console.log('[SessionServiceMock] Logout executado');
    this.currentSession = null;
    localStorage.removeItem('auth_token');
    return of(undefined).pipe(delay(100));
  }
}
