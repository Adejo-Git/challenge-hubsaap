# AuthSession

Gerenciador centralizado e reativo de estado de autenticação para o frontend do Hub SaaP.

**Resumo:** AuthSession é a **única fonte de verdade** do estado de autenticação. Fornece APIs para restaurar sessão do storage seguro, manter estado reativo (user/claims/token/expiry), renovar token com single-flight concurrency e emitir eventos de lifecycle sem expor dados sensíveis.

---

## Índice

1. [Responsabilidades](#responsabilidades)
2. [O que NÃO é responsabilidade](#o-que-não-é-responsabilidade)
3. [Inputs e Outputs](#inputs-e-outputs)
4. [Como usar](#como-usar)
5. [Ciclo de vida da sessão](#ciclo-de-vida-da-sessão)
6. [APIs públicas](#apis-públicas)
7. [Segurança](#segurança)
8. [Validação & Checklist](#validação--checklist)
9. [Troubleshooting](#troubleshooting)
10. [Padrões implementados](#padrões-implementados)

---

## Responsabilidades

✅ **O AuthSession é responsável por:**

- **Centralizar** o estado autenticação do frontend (session$ + snapshot)
- **Restaurar** sessão do storage seguro com validação de expiração
- **Expor estado reativo** (BehaviorSubject) para consumidores (guards, interceptors, Access Layer)
- **Fornecer token** de forma encapsulada via `getAccessToken()`
- **Renovar token** com single-flight de múltiplas chamadas concorrentes
- **Limpar sessão** em logout/expiry e resetar estado
- **Emitir eventos** mínimos de lifecycle (session.restore, session.expired, session.refresh, session.logout) **sem dados sensíveis**
- **Validar expiração** com suporte a clock skew (`refreshSkewSeconds`)

---

## O que NÃO é responsabilidade

❌ **AuthSession NÃO faz:**

- Controlar navegação/redirect de rotas (responsabilidade do `AuthGuard` do Shell)
- Anexar header `Authorization` em requests (responsabilidade do `auth-interceptor`)
- Implementar regras de RBAC/ABAC/policies (responsabilidade do `permission-rbac` ou `access-decision`)
- Fazer chamadas HTTP diretas para auth (protocolo OIDC é externo; AuthSession apenas coordena)
- Logar tokens ou claims completas em telemetria (segurança em primeiro lugar)

---

## Inputs e Outputs

### Inputs (Dependências injetáveis)

| Nome | Tipo | Detalhe |
|------|------|---------|
| `storage` | `AuthSessionStorage` | Adapter para persistência segura de sessão (namespace + TTL) |
| `config` | `RuntimeConfig` | `{ refreshEnabled?: boolean; refreshSkewSeconds?: number }` |
| `time` | `TimeProvider` | Fonte de timestamp (padrão: `SystemTime`); facilita testes |
| `observability` | `ObservabilityService` (opcional) | Telemetria mínima: `.track(eventName, metadata)` |
| `strategy` | `RefreshStrategy` (opcional) | Estratégia de refresh (padrão: `NoRefreshStrategy`) |

### Outputs (APIs Públicas)

| Nome | Retorno | Detalhe |
|------|---------|---------|
| `session$` | `Observable<SessionState>` | Stream reativo do estado autenticação |
| `snapshot()` | `SessionSnapshot` | Snapshot imutável do estado atual |
| `getAccessToken()` | `string \| null` | Token/credencial atual (null se expirado) |
| `restore()` | `Promise<SessionSnapshot>` | Restaura sessão do storage; lança `SessionExpiredError` se expirada |
| `refresh()` | `Promise<SessionSnapshot>` | Renova token via strategy; lança `RefreshFailedError` se falhar |
| `logout()` | `Promise<void>` | Limpa storage e emite evento de logout |
| `clear()` | `Promise<void>` | Limpa storage e resetar estado (sem evento tracking) |

### Tipos Principais

```typescript
// Estado observável/snapshot
interface SessionState {
  authenticated: boolean;           // true se há sessão válida
  status: SessionStatus;            // unknown | authenticated | unauthenticated | expired | invalid
  user: UserProfileLite | null;     // Dados mínimos do usuário (id, name, email)
  claims: ClaimsLite | null;        // Claims JWT (sub, email, roles, ...)
  exp: number | null;               // Epoch seconds de expiração
}

enum SessionStatus {
  Unknown = 'unknown',              // Inicial
  Authenticated = 'authenticated',  // Sessão válida
  Unauthenticated = 'unauthenticated', // Sem autenticação
  Expired = 'expired',              // Expirou
  Invalid = 'invalid'               // Inválida
}

// Perfis mínimos (sem dados sensíveis completos)
interface UserProfileLite {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

interface ClaimsLite {
  sub?: string;                     // Subject (user ID)
  email?: string;
  roles?: string[];
  [key: string]: string | string[] | number | boolean | undefined;
}
```

---

## Como usar

### 1. Inicializar no bootstrap (AppShell / main.ts)

```typescript
import { AuthSessionService } from '@hubsaap/auth-session';
import { AuthSessionStorage } from '@hubsaap/auth-session';

@NgModule({
  providers: [
    {
      provide: AuthSessionService,
      useFactory: (storage: AuthSessionStorage, config: RuntimeConfig, obs: ObservabilityService) => {
        return new AuthSessionService(
          storage,
          { refreshEnabled: true, refreshSkewSeconds: 60 },
          undefined, // SystemTime padrão
          obs
        );
      },
      deps: [AuthSessionStorage, RuntimeConfig, ObservabilityService]
    }
  ]
})
export class AppModule {}
```

### 2. Restaurar sessão no startup

```typescript
export class AppComponent implements OnInit {
  constructor(private authSession: AuthSessionService) {}

  async ngOnInit() {
    try {
      const snapshot = await this.authSession.restore();
      console.log('Sessão restaurada:', snapshot.authenticated);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        console.log('Sessão expirada, redirecionando para login...');
        // Redirecionar para login
      }
    }
  }
}
```

### 3. Consumir estado reativo em componentes

```typescript
export class DashboardComponent implements OnInit {
  session$ = this.authSession.session$; // Observable<SessionState>

  constructor(private authSession: AuthSessionService) {}

  ngOnInit() {
    this.session$.pipe(
      filter(s => s.authenticated),
      map(s => s.user?.name)
    ).subscribe(name => {
      console.log('Bem-vindo,', name);
    });
  }
}
```

```html
<!-- Template -->
<div *ngIf="(session$ | async) as session">
  <ng-container *ngIf="session.authenticated">
    <p>Olá, {{ session.user?.name }}!</p>
    <button (click)="logout()">Logout</button>
  </ng-container>

  <ng-container *ngIf="!session.authenticated">
    <p>Não autenticado</p>
  </ng-container>
</div>
```

### 4. Obter token encapsulado

```typescript
export class DataService {
  constructor(
    private http: HttpClient,
    private authSession: AuthSessionService
  ) {}

  fetchUserProfile() {
    const token = this.authSession.getAccessToken();
    if (!token) {
      throw new Error('Sem token disponível');
    }
    // Token já está encapsulado, pronto para usar
    return this.http.get('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
```

### 5. Renovar token explicitamente (se needed)

```typescript
async renewToken() {
  try {
    const snapshot = await this.authSession.refresh();
    console.log('Token renovado, expira em:', new Date(snapshot.exp! * 1000));
  } catch (err) {
    if (err instanceof RefreshFailedError) {
      console.error('Falha ao renovar token');
      // Redirecionar para login
    }
  }
}
```

### 6. Logout

```typescript
async logout() {
  await this.authSession.logout(); // Limpa storage, emite evento, reseta estado
  // Redirecionar para login
}
```

---

## Ciclo de vida da sessão

```
┌─────────────────────────────────────────────────────────────┐
│                     APP BOOTSTRAP                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │    authSession.restore()    │
         └────────┬────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
    ┌───▼──────┐        ┌───▼──────┐
    │  EMPTY   │        │  VALID   │
    │ Storage  │        │ Session  │
    └───┬──────┘        └────┬─────┘
        │ emit:             │emit: session.restore
        │session.restore    │status: Authenticated
        │                   │
        │                   ▼
        │            ┌──────────────┐
        │            │ AUTHENTICATED│
        │            │   STATE      │
        │            └──────┬───────┘
        │                   │
        │                   │ [Token expires]
        │                   ▼
        │            ┌──────────────┐
        │            │  EXPIRED     │
        │            │  SESSION     │
        │            └──────┬───────┘
        │                   │
        │     ┌─────────────┴─────────────┐
        │     │ emit: session.expired     │
        │     │ lança: SessionExpiredError│
        │     │ limpa storage             │
        │     │                           │
        │     ▼                           ▼
        └──► UNAUTHENTICATED   ◄──────────┘
             STATE
             (redirect to login)

    [Manual Logout]
             │
             ▼
       authSession.logout()
             │
       emit: session.logout
       clear storage
       status: Unauthenticated
```

---

## APIs públicas

### `session$: Observable<SessionState>`

Stream reativo do estado autenticação. Emite sempre que o estado muda (restore, refresh, logout, etc).

```typescript
this.authSession.session$.subscribe(state => {
  console.log('Usuário auth:', state.authenticated);
  console.log('User:', state.user);
  console.log('Expira em:', new Date(state.exp! * 1000));
});
```

**Quando emite:**
- No bootstrap (estado inicial)
- Após `restore()` bem-sucedido
- Após `refresh()` bem-sucedido
- Após `logout()` ou `clear()`
- Quando expiração é detectada em `restore()`

---

### `snapshot(): SessionSnapshot`

Retorna cópia imutável do estado atual **síncrono** (não Observable).

```typescript
const current = this.authSession.snapshot();
if (current.authenticated && current.exp) {
  const expiresIn = (current.exp * 1000) - Date.now();
  console.log('Token expira em', expiresIn, 'ms');
}
```

---

### `getAccessToken(): string | null`

Retorna token atual **encapsulado** se válido, null caso contrário.

- Valida expiração automaticamente
- Retorna null sem lançar erro (falha silenciosa por design)
- Seguro para usar em guards/interceptors

```typescript
const token = this.authSession.getAccessToken();
if (token) {
  // Token está válido e pronto para usar
}
```

---

### `restore(): Promise<SessionSnapshot>`

Restaura sessão do storage seguro. Chamada tipicamente no bootstrap.

**Comportamento:**
1. Lê sessão do storage
2. Se vazia → retorna estado `Unauthenticated`
3. Se expirada → limpa storage, lança `SessionExpiredError`
4. Se válida → atualiza estado, retorna snapshot
5. Emite evento `session.restore` com resultado

```typescript
try {
  const snapshot = await this.authSession.restore();
  console.log('Restaurado:', snapshot.authenticated);
} catch (err) {
  if (err instanceof SessionExpiredError) {
    console.log('Sessão expirada - faça login novamente');
  }
}
```

**Erros:**
- `SessionExpiredError` - Sessão expirou
- Erros do storage (read failed)

---

### `refresh(): Promise<SessionSnapshot>`

Renova token via strategy com **single-flight** (múltiplas chamadas = uma request).

**Pré-requisitos:**
- `config.refreshEnabled === true`
- Strategy implementado (não `NoRefreshStrategy`)

**Comportamento:**
1. Verifica se refresh está habilitado
2. Entra no "gate" single-flight (coalesce de chamadas concorrentes)
3. Chama `strategy.refresh(currentRecord)`
4. Valida resposta (token + exp obrigatórios)
5. Atualiza storage e estado
6. Emite evento `session.refresh`
7. Múltiplas chamadas concorrentes retornam **mesma Promise**

```typescript
// Múltiplas chamadas concorrentes
const [r1, r2, r3] = await Promise.all([
  this.authSession.refresh(),
  this.authSession.refresh(),
  this.authSession.refresh()
]);
// r1, r2, r3 são idênticos (mesma Promise executada uma vez)
```

**Erros:**
- `RefreshFailedError` - Se `refreshEnabled === false` ou strategy falha
- Erros do strategy (rede, invalidade, etc)

---

### `logout(): Promise<void>`

Limpa storage, reseta estado e **emite evento** de logout.

```typescript
await this.authSession.logout();
// Storage limpo
// Estado: Unauthenticated
// Evento 'session.logout' emitido
```

---

### `clear(): Promise<void>`

Limpa storage e reseta estado (sem emitir evento tracking).

```typescript
await this.authSession.clear();
// Storage limpo
// Estado: Unauthenticated
// Sem evento tracking
```

---

## Segurança

### Princípios de segurança

✅ **O que AuthSession protege:**

1. **Token Encapsulado**
   - Token nunca exposto em logs, telemetria ou templates
   - Acessível apenas via `getAccessToken()` (método controlado)
   - Validade verificada antes de retornar

2. **Nenhum Log de Dados Sensíveis**
   - Eventos contêm apenas status/resultado
   - Nunca incluem token, claims completas ou user completo
   - Exemplo: `{ result: 'ok' }` em vez de `{ token: '...', user: {...} }`

3. **Expiração Validada**
   - `restore()` detecta expiração e limpa storage automaticamente
   - `getAccessToken()` retorna null se expirado
   - Suporte a clock skew (`refreshSkewSeconds`)

4. **Storage Abstrato**
   - Implementar `AuthSessionStorage` fisicamente seguro (localStorage, sessionStorage com encriptação, ou service worker)
   - AuthSession apenas coordena, não assume armazenamento

### O que confiar a camadas externas

❌ **Responsabilidades de segurança FORA de AuthSession:**

| Responsabilidade | Camada |
|-----------------|--------|
| Encriptação of token em repouso | `storage-secure` |
| Anexar header `Authorization` | `auth-interceptor` |
| Validação de RBAC/user permissions | `permission-rbac`, guards |
| Redirecionamento seguro pós-logout | `AuthGuard`, router |
| Validação JWT (assinatura) | OIDC library / backend |

---

## Validação & Checklist

### Critérios de aceite implementados

✅ Existe uma **única fonte de verdade** do estado auth (session$ + snapshot)
✅ `restore()` recupera sessão de forma **segura** e detecta **expiração**
✅ `refresh()` é **single-flight** e não dispara múltiplos refresh concorrentes
✅ `logout`/`clear` limpam **storage e estado corretamente**
✅ Nenhum log/telemetria contém **token ou claims completas**
✅ Testes cobrem restore/expiry/refresh/logout (24 testes, 100% passando)

### Validação manual

1. **Restore válido**
   - ✅ Sessão carregada do storage
   - ✅ Estado = `Authenticated`
   - ✅ `session$` emite novo valor
   - ✅ Evento `session.restore` emitido com `result: 'ok'`

2. **Restore expirado**
   - ✅ `SessionExpiredError` lançado
   - ✅ Storage limpo
   - ✅ Estado = `Expired` → `Unauthenticated`
   - ✅ Eventos `session.expired` e `session.restore` emitidos
   - ✅ Nenhum token no evento

3. **Refresh com single-flight**
   - ✅ Chamadas concorrentes coalescem (mesma Promise)
   - ✅ Strategy chamado uma única vez
   - ✅ Novo token salvo em storage
   - ✅ Evento `session.refresh` emitido

4. **Logout**
   - ✅ Storage limpo
   - ✅ Estado resetado
   - ✅ Evento `session.logout` emitido
   - ✅ `getAccessToken()` retorna null

---

## Troubleshooting

### 1. "SessionExpiredError ao restaurar"

**Causa:** Sessão armazenada expirou.

**Solução:**
1. Limpar dados de teste antigos
2. Usar novo token com `exp` futuro
3. Se em produção: redirecionar para login

```typescript
import { SessionExpiredError } from '@hubsaap/auth-session';

try {
  await authSession.restore();
} catch (err) {
  if (err instanceof SessionExpiredError) {
    // Redirecionar para login
    router.navigate(['/login']);
  }
}
```

---

### 2. "getAccessToken() retorna null mesmo com sessão autenticada"

**Causa:** Token expirou (validação automática).

**Solução:**
1. Chamar `refresh()` para renovar token
2. Verificar se `refreshEnabled: true` em config
3. Validar expiração em teste: `exp` em epoch seconds, não ms

```typescript
const token = authSession.getAccessToken();
if (!token) {
  try {
    await authSession.refresh(); // Renovar
    const newToken = authSession.getAccessToken();
  } catch (err) {
    console.error('Refresh falhou:', err);
  }
}
```

---

### 3. "refresh() lança RefreshFailedError"

**Causa:** Um de:
1. `refreshEnabled: false` em config
2. Strategy retornar token/exp inválido
3. Strategy error (rede, unauthorized, etc)

**Solução:**
```typescript
try {
  await authSession.refresh();
} catch (err) {
  if (err instanceof RefreshFailedError) {
    if (err.message.includes('disabled')) {
      console.error('Refresh desabilitado em config');
    } else {
      console.error('Falha do strategy:', err.message);
      // Redirecionar para login
    }
  }
}
```

---

### 4. "Múltiplas chamadas de refresh criando múltiplas requests"

**Causa:** Strategy não implementada corretamente ou single-flight não ativo.

**Diagnóstico:**
- Verificar se `config.refreshEnabled === true`
- Verificar se strategy é diferente de `NoRefreshStrategy`
- Monitorar logs de strategy (quantas vezes é chamado)

**Solução:**
- Single-flight é ativo por padrão
- Garantir que todas as chamadas de refresh() usam mesma service instance

---

### 5. "Evento de session.logout não disparado"

**Causa:** Usar `clear()` em vez de `logout()`.

**Diferença:**
- `logout()` → Limpa + **emite evento** `session.logout`
- `clear()` → Limpa (sem evento tracking)

**Solução:**
```typescript
// Use logout() se precisa do evento
await authSession.logout(); // Emite 'session.logout'

// Use clear() se não quer tracking
await authSession.clear(); // Silencioso
```

---

### 6. "Token/claims aparecem em logs de observabilidade"

**Causa:** Implementação customizada de ObservabilityService expondo dados.

**Garantia AuthSession:** Eventos de AuthSession nunca contêm token/claims. Se vê dados sensíveis, é da implementação outside.

**Debug:**
```typescript
obs.events.forEach(e => {
  const str = JSON.stringify(e);
  if (str.includes('token') || str.includes('Bearer')) {
    console.error('SEGURANÇA: Token em evento:', e.name);
  }
});
```

---

### 7. "Snapshot mutado está afetando estado interno"

**Causa:** Bug em snapshot (deverá retornar cópia imutável).

**Verificar:**
```typescript
const snap1 = authSession.snapshot();
snap1.authenticated = false;
const snap2 = authSession.snapshot();
console.assert(snap2.authenticated === true, 'Snapshot não é imutável!');
```

**Se falhar:** Reportar bug. AuthSession garante que snapshot() retorna cópia.

---

## Padrões implementados

### 1. **Single-Flight Refresh**

Múltiplas chamadas de `refresh()` concorrentes coalescem para uma **única request/promise**.

**Benefício:** Evita race conditions em cenários de múltiplas requisições simultâneas.

```typescript
// Cenário: 3 componentes chamam refresh() no mesmo tempo
const p1 = authSession.refresh();
const p2 = authSession.refresh();
const p3 = authSession.refresh();

// Resultado: p1 === p2 === p3 (mesma Promise)
// Strategy executado uma única vez
const results = await Promise.all([p1, p2, p3]);
// results[0] === results[1] === results[2]
```

**Implementação:** Classe `SingleFlightRefresh` com gate interno.

---

### 2. **Reactive State (RxJS)**

Estado é um `BehaviorSubject<SessionState>` exposto como `session$: Observable`.

**Benefício:** Automático em templates, fácil de filtrar/map, push-based updates.

```typescript
// Template: atualiza automaticamente
<div *ngIf="(session$ | async) as s">
  {{ s.user?.name }}
</div>

// Component: reativo
this.session$.pipe(
  filter(s => s.authenticated),
  distinctUntilChanged((a, b) => a.user?.id === b.user?.id)
).subscribe(...)
```

---

### 3. **Adapter Pattern (Storage)**

`AuthSessionStorage` é abstração sobre storage físico (localStorage, sessionStorage, service worker, etc).

**Benefício:** AuthSession não conhece detalhes de persistência; facilita mocking em testes.

```typescript
// AuthSession só conhece interface
interface AuthSessionStorage {
  read(): Promise<SessionRecord | null>;
  write(record: SessionRecord): Promise<void>;
  clear(): Promise<void>;
}

// Implementação pode ser qualquer coisa
class LocalStorageImpl implements AuthSessionStorage { ... }
class EncryptedStorageImpl implements AuthSessionStorage { ... }
class InMemoryStorageImpl implements AuthSessionStorage { ... } // Testes
```

---

### 4. **Strategy Pattern (Refresh)**

`RefreshStrategy` é plugável, permitindo diferentes estratégias de renovação.

**Benefício:** Suportar OIDC, custom refresh, ou disable refresh sem mudar AuthSession.

```typescript
// Interface abstrata
interface RefreshStrategy {
  refresh(record: SessionRecord | null): Promise<RefreshResult>;
}

// Implementações concretas
class NoRefreshStrategy implements RefreshStrategy { ... } // Padrão
class OIDCRefreshStrategy implements RefreshStrategy { ... }
class CustomRefreshStrategy implements RefreshStrategy { ... }

// Injetar no constructor
new AuthSessionService(storage, config, time, obs, new OIDCRefreshStrategy());
```

---

### 5. **Encapsulation**

Token, claims e detalhes de storage são privados. Apenas snapshots públicos e métodos seguros.

**Benefício:** Reduz superfície de ataque, força consumidores a passar por APIs seguras.

```typescript
// ❌ NÃO EXPOSTO
authSession['record'] // private
authSession['accessToken'] // private

// ✅ EXPOSTO
authSession.getAccessToken() // Valida expiração, retorna null se inválido
authSession.snapshot() // Cópia imutável
authSession.session$ // Observable (push-based, não polling)
```

---

### 6. **Event Sourcing (Observability)**

Eventos de lifecycle emitidos sem dados sensíveis, facilitando auditoria/debug.

```typescript
// Eventos emitidos
'session.restore' + { result: 'ok' | 'empty' | 'expired' }
'session.expired' + { result: 'expired' }
'session.refresh' + { result: 'ok' | 'fail' }
'session.logout' + { result: 'ok' }

// Nenhum contém: token, claims, password, user completo
```

---

## Estrutura de diretórios

```
libs/auth-session/
├── src/
│   ├── index.ts                      # Exports públicos
│   ├── test-setup.ts                 # Setup Jest
│   └── lib/
│       ├── auth-session.model.ts     # Types e interfaces
│       ├── auth-session.service.ts   # Service principal
│       ├── auth-session.storage.ts   # Adapter de storage
│       ├── auth-session.strategy.ts  # Strategy pattern (refresh)
│       ├── auth-session.errors.ts    # Erros padronizados
│       ├── auth-session.util.ts      # Helpers (expiração, time)
│       └── auth-session.spec.ts      # 24 testes (restore/refresh/logout/obs)
├── jest.config.ts                    # Jest configuration
├── tsconfig.lib.json                 # TypeScript (build)
├── tsconfig.spec.json                # TypeScript (testes)
├── project.json                      # Nx project config
└── README.md                          # Este arquivo
```

---

## Testing

### Rodar testes localmente

```bash
# Instalação (uma única vez)
npm install

# Executar testes
npx jest --config libs/auth-session/jest.config.ts --no-coverage

# Watch mode (desenvolvimento)
npx jest --config libs/auth-session/jest.config.ts --watch

# Com cobertura
npx jest --config libs/auth-session/jest.config.ts --coverage
```

### Coverage

Testes cobrem:
- ✅ Restore (válido, vazio, expirado, com skew)
- ✅ Snapshot (imutabilidade)
- ✅ GetAccessToken (válido, null, expirado)
- ✅ Refresh (success, fail, single-flight, preservação de dados)
- ✅ Logout/Clear (limpeza)
- ✅ Session$ (reatividade)
- ✅ Observability (rastreamento de eventos, sem dados sensíveis)

**24 testes, 100% passando.**

---

## Contribuindo

### Modificar AuthSession

1. Edite arquivo relevante em `libs/auth-session/src/lib/`
2. Rode testes: `npx jest --config libs/auth-session/jest.config.ts --watch`
3. Garanta testes verdes antes de submeter PR
4. Atualize README.md se mudar APIs públicas

### Adicionar teste

```typescript
// libs/auth-session/src/lib/auth-session.spec.ts
describe('AuthSessionService', () => {
  it('seu novo teste', async () => {
    const service = new AuthSessionService(...);
    const result = await service.yourMethod();
    expect(result).toBe(...);
  });
});
```

---

## FAQ

**P: Posso usar AuthSession sem AuthGuard?**
R: Sim, mas não recomendável. AuthGuard controla acesso às rotas; AuthSession apenas gerencia estado. Use ambos.

**P: Como configurar OIDC com refresh?**
R: Implemente `RefreshStrategy` customizado e passe no constructor. AuthSession coordena, não implementa OIDC.

**P: O token está seguro em `session$`?**
R: Sim. Consumidor acessa snapshot (cópia imutável), não token direto. Use `getAccessToken()` para token.

**P: Qual a diferença entre restore() e snapshot()?**
R: `restore()` é async e carrega do storage; `snapshot()` é sync e retorna estado em memória.

**P: Como resetar estado programaticamente?**
R: Use `clear()` (silencioso) ou `logout()` (com evento).

---

## Referências

- [Ficha Técnica AuthSession](../../fichas%20tecnicas/Ficha%20Tecnica%20AuthSession.txt)
- [Testes Unitários](./src/lib/auth-session.spec.ts)
- [Implementação completa](./src/lib/)

---

**Versão:** 1.0.0  
**Último atualizado:** Fevereiro 2026  
**Status:** ✅ Produção (24 testes passando, validator aprovado)
