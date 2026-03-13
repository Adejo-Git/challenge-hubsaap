# AuthGuard

## 1. Resumo do componente

Guard de autenticação do Hub SaaP. Bloqueia rotas protegidas quando não há sessão válida e conduz o usuário ao fluxo de login preservando a URL de retorno (`returnUrl`).

**Arquivo principal:** `auth-guard.ts`
**Localização:** `apps/shell/src/app/shell/auth/auth-guard/`

---

## 2. Responsabilidades

| Faz | Não faz |
|-----|---------|
| Bloquear rotas protegidas sem sessão válida | Autorizar ações/recursos (RBAC/ABAC) |
| Preservar e passar `returnUrl` no redirect | Implementar regras de policies |
| Tentar restaurar sessão via `SessionService.restoreOrRefresh()` antes de negar | Fazer chamadas HTTP diretas |
| Retornar `boolean` ou `UrlTree` de forma determinística | Armazenar tokens (responsabilidade do `SessionService`) |
| Registrar evento mínimo de decisão (`GUARD_ALLOW` / `GUARD_DENY`) | Logar dados sensíveis (tokens, claims completas) |

---

## 3. Inputs e Outputs

### Inputs (dependências injetadas)

| Dependência | Papel |
|---|---|
| `SessionService` | Fonte única do estado de autenticação: `isAuthenticated()`, `restoreOrRefresh()` |
| `Router` (Angular) | Construção do `UrlTree` de redirect para login |
| `ActivatedRouteSnapshot` / `RouterStateSnapshot` | Fornece `state.url` para compor o `returnUrl` |
| `ObservabilityService` | Registro de eventos `GUARD_ALLOW` e `GUARD_DENY` |

### Outputs (retorno de `canActivate`)

| Resultado | Quando ocorre |
|---|---|
| `true` | Sessão ativa — navegação liberada |
| `true` (após restore) | Sessão restaurada com sucesso via `restoreOrRefresh()` |
| `UrlTree` → `/auth/login?returnUrl=...` | Não autenticado e restore falhou — redireciona para login |

---

## 4. Como usar

### Proteger uma rota do Shell

```ts
// app.routes.ts
import { AuthGuard } from './shell/auth/auth-guard/auth-guard';

export const routes: Routes = [
  {
    path: 'tools',
    canActivate: [AuthGuard],
    loadChildren: () => import('./tools/tools.routes'),
  },
];
```

### Proteger rotas lazy (/tools/*)

```ts
{
  path: 'tools',
  canActivate: [AuthGuard],   // bloqueia antes de carregar o chunk
  loadChildren: () => import('../tools/tools.module').then(m => m.ToolsModule),
}
```

### Fluxo de decisão

```
canActivate() chamado
       │
       ▼
session.isAuthenticated()?
  ├─ SIM → logEvent(GUARD_ALLOW, authenticated) → return true
  └─ NÃO → session.restoreOrRefresh()
               ├─ restored && isAuthenticated()
               │    → logEvent(GUARD_ALLOW, session_restored) → return true
               └─ não restaurado
                    → logEvent(GUARD_DENY, not_authenticated)
                    → return UrlTree(/auth/login?returnUrl=<url>)
```

### Função auxiliar `buildLoginRedirectUrl`

```ts
// auth-redirect.util.ts
buildLoginRedirectUrl('/tools/dashboard')
// → '/auth/login?returnUrl=%2Ftools%2Fdashboard'

buildLoginRedirectUrl('/auth/login')
// → '/auth/login'  (evita loop)
```

---

## 5. Critérios de validação

- [ ] Rota protegida não abre sem sessão válida
- [ ] Ao negar, redireciona para `/auth/login` com `returnUrl` correto
- [ ] Se sessão persistida puder ser restaurada, libera a rota sem interação do usuário
- [ ] Nenhuma chamada `HttpClient` direta no guard
- [ ] Sem redirect infinito (URL `/auth/login` não gera novo redirect)
- [ ] Eventos `GUARD_ALLOW` / `GUARD_DENY` registrados no `ObservabilityService` sem dados sensíveis
- [ ] Testes passando: `authenticated`, `not authenticated`, `session restored`

**Checklist de PR:**
- [ ] PR descreve rotas impactadas e comportamento de fallback
- [ ] Build / lint / tests passando
- [ ] `SessionService` é a única fonte de autenticação no guard
- [ ] Sem logs de token ou claims completas
- [ ] Cenários de loop validados

---

## 6. Troubleshooting

### Redirect infinito para `/auth/login`

**Causa:** A rota `/auth/login` está protegida pelo próprio `AuthGuard`.
**Solução:** Remover o `AuthGuard` das rotas públicas (`/auth/**`). Verificar que `buildLoginRedirectUrl` retorna `/auth/login` sem `returnUrl` quando a URL já começa com `/auth/login`.

---

### `returnUrl` não preservado após login

**Causa:** O componente de login não lê o parâmetro `returnUrl` da query string.
**Solução:** No callback de login bem-sucedido, ler `this.route.snapshot.queryParams['returnUrl']` e navegar para ele (com `router.navigateByUrl`). Validar que a URL não aponta para domínio externo antes de usar.

---

### Guard liberando rota mesmo sem sessão

**Causa:** `SessionService.isAuthenticated()` retornando `true` indevidamente (token expirado não validado).
**Solução:** Garantir que `isAuthenticated()` valida expiração do token localmente antes de retornar `true`. O guard confia nesta fonte.

---

### `GUARD_ALLOW` / `GUARD_DENY` não aparecem na telemetria

**Causa:** `ObservabilityService` não injetado corretamente ou não inicializado.
**Solução:** Verificar se `ObservabilityService` está provido no módulo raiz. O guard usa injeção via construtor — checar se o `providedIn: 'root'` do guard está ativo.

---

### Sessão não é restaurada mesmo com storage disponível

**Causa:** `SessionService.restoreOrRefresh()` não encontra artefatos no storage ou o token armazenado expirou.
**Solução:** Verificar o `StorageService` (indiretamente via `SessionService`). O guard chama `restoreOrRefresh()` uma única vez — não há retry automático.
