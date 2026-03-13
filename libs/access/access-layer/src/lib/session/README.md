# SessionService

## Overview

`SessionService` é uma facade do **Access Layer** que encapsula a compartilhada `AuthSessionService` e fornece uma API estável, normalizada e segura para consumo por Shell e Tools.

## Responsabilidades

- ✅ Ponto único de acesso para sessão no Hub (Shell/Tools NÃO importam auth-session diretamente)
- ✅ Encapsular detalhes de storage/strategy/token
- ✅ Normalizar estado de sessão para modelo "lite" (sem dados sensíveis)
- ✅ Fornecer helpers seguros (`isAuthenticated`, `claimsLite`)
- ✅ Integrar com `ObservabilityService` para eventos de lifecycle (sem PII)

## Não Responsabilidades

- ❌ Não faz HttpClient direto
- ❌ Não controla navegação/redirect (isso é `AuthGuard`)
- ❌ Não implementa RBAC/ABAC/policies (isso é `AccessDecisionService`)
- ❌ Não expõe token bruto amplamente
- ❌ Não loga dados sensíveis (token, claims completas, PII)

## API

### session$(): Observable\<SessionStateLite\>

Stream reativo do estado de sessão normalizado. Use para UI que precisa reagir a mudanças de autenticação.

```typescript
constructor(private session: SessionService) {}

ngOnInit() {
  this.session.session$().subscribe((state) => {
    console.log('Authenticated:', state.authenticated)
  })
}
```

### snapshot(): SessionSnapshot

Snapshot síncrono do estado atual. Use para decisões rápidas sem observables.

```typescript
if (this.session.snapshot().authenticated) {
  // User is logged in
}
```

### isAuthenticated(): boolean

Helper booleano determinístico.

```typescript
if (this.session.isAuthenticated()) {
  // Proceed
}
```

### claimsLite(): ClaimsLite | null

Retorna claims normalizadas (roles, groups, email, sub).

```typescript
const claims = this.session.claimsLite()
if (claims?.roles?.includes('admin')) {
  // User has admin role
}
```

### async restoreOrRefresh(): Promise\<SessionSnapshot\>

Restaura sessão do storage. Chamado pelo Shell durante bootstrap.

```typescript
try {
  const snapshot = await this.session.restoreOrRefresh()
} catch (error) {
  // Session restoration failed (expired, invalid, etc.)
}
```

### async logout(): Promise\<void\>

Limpa sessão e emite evento de logout.

```typescript
await this.session.logout()
```

## Tipos

### SessionStateLite

```typescript
interface SessionStateLite {
  authenticated: boolean
  status: SessionStatus
  user: UserLite | null
  claims: ClaimsLite | null
  exp: number | null
}
```

### SessionStatus

```typescript
enum SessionStatus {
  Unknown = 'unknown',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
  Expired = 'expired',
  Invalid = 'invalid'
}
```

### ClaimsLite

```typescript
interface ClaimsLite {
  sub?: string
  email?: string
  roles?: string[]
  groups?: string[]
  [key: string]: string | string[] | number | boolean | undefined
}
```

## Integração

### No Shell (AppComponent/AuthGuard)

```typescript
constructor(private session: SessionService) {}

async ngOnInit() {
  try {
    await this.session.restoreOrRefresh()
  } catch (error) {
    // Route to error page or login
  }
}
```

### Em um Tool

Tools consumem SessionService via contrato do Tool Plugin. Não importam directamente.

## Observabilidade

SessionService emite eventos mínimos via `ObservabilityService`:

- `session.service.restore`: { authenticated, reason }
- `session.service.logout`: { reason }

Nenhum evento contém token, claims completas ou PII.

## Architectural Constraints

- SessionService é um **facade**; não estende lógica além do encapsulamento seguro de `AuthSessionService`.
- Modelo "lite" é **imutável** em relação ao protótipo do `AuthSessionService`.
- **Sem vazamento** de token ou dados sensíveis em observabilidade/logs.
- Shell é o único consumidor direto de `SessionService`; Tools consomem via `AccessLayerFacade` ou `ToolPlugin`.
