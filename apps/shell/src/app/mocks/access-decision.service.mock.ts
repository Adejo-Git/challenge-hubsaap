import { Injectable } from '@angular/core';
import { AccessDecisionRequest, AccessDecisionResult } from '@hub/access-decision';

/**
 * AccessDecisionServiceMock
 *
 * Test double para AccessDecisionService (@hub/access-decision).
 * Retorna decisões configuráveis via setDecision(), permitindo que
 * specs de guards/rotas controlem o resultado sem precisar instanciar
 * todos os ports reais (authSession, featureFlags, etc.).
 *
 * Uso em testes:
 *   accessDecision.setDecision({ allowed: false, denyReason: 'unauthenticated' });
 *   // Chamar guard... esperar redirecionamento para /login
 */
@Injectable({ providedIn: 'root' })
export class AccessDecisionServiceMock {
  private _result: Partial<AccessDecisionResult> = { allowed: true };

  /** Configura o resultado retornado por canEnter/canView/canExecute. */
  setDecision(result: Partial<AccessDecisionResult>): void {
    this._result = result;
  }

  /** Reseta para o estado padrão (allow). */
  reset(): void {
    this._result = { allowed: true };
  }

  canEnter(_request: AccessDecisionRequest): AccessDecisionResult {
    void _request;
    return { action: 'enter', allowed: true, ...this._result };
  }

  canView(_request: AccessDecisionRequest): AccessDecisionResult {
    void _request;
    return { action: 'view', allowed: true, ...this._result };
  }

  canExecute(_request: AccessDecisionRequest): AccessDecisionResult {
    void _request;
    return { action: 'execute', allowed: true, ...this._result };
  }
}
