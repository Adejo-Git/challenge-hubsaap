# AccessDecision

> Asset central de decisÃ£o de acesso no frontend: consolida feature flags, RBAC e policies em uma API Ãºnica (canEnter/canView/canExecute) consumida por Shell e Tools, sempre retornando decisÃ£o explÃ­cita com denyReason padronizado.

---

## Ãndice

1. [Resumo](#resumo)
2. [Responsabilidades](#responsabilidades)
3. [Quando usar](#quando-usar)
4. [Inputs e Outputs](#inputs-e-outputs)
5. [Como usar](#como-usar)
   - [InstalaÃ§Ã£o](#instalaÃ§Ã£o)
   - [ConfiguraÃ§Ã£o bÃ¡sica](#configuraÃ§Ã£o-bÃ¡sica)
   - [Exemplos de uso](#exemplos-de-uso)
6. [API PÃºblica](#api-pÃºblica)
7. [Ordem de decisÃ£o (determinÃ­stica)](#ordem-de-decisÃ£o-determinÃ­stica)
8. [DenyReason: Tipos e significados](#denyreason-tipos-e-significados)
9. [Observability](#observability)
10. [Troubleshooting](#troubleshooting)
11. [Exemplos avanÃ§ados](#exemplos-avanÃ§ados)
12. [Testes](#testes)
13. [DependÃªncias](#dependÃªncias)
14. [LimitaÃ§Ãµes conhecidas](#limitaÃ§Ãµes-conhecidas)

---

## Resumo

**AccessDecisionService** centraliza a decisÃ£o de acesso para rotas, views e aÃ§Ãµes no frontend do Hub SaaP.

O serviÃ§o:
- Combina **auth-session** (autenticaÃ§Ã£o), **feature-flags** (habilitaÃ§Ã£o) e contratos de autorizaÃ§Ã£o/ABAC via **ports** (adapters)
- Produz decisÃ£o **determinÃ­stica** e **auditÃ¡vel**
- Retorna negaÃ§Ã£o **explÃ­cita** com `denyReason` padronizado (nunca negaÃ§Ã£o silenciosa)
- **NÃ£o autentica usuÃ¡rio**, **nÃ£o faz IO/HTTP** e **nÃ£o renderiza UI**

Importante: neste workspace, nÃ£o hÃ¡ (ainda) libs Nx chamadas `permission-rbac`, `policy-engine` ou `observability-service`. Em vez disso, o `access-decision` foi desenhado para depender de **interfaces (ports)** e permitir que Shell/Tools forneÃ§am adapters para as capacidades de RBAC/Policy/Observability.

**Consumidores tÃ­picos**: RouteGuards, NavigationService, componentes que precisam gating de aÃ§Ãµes (toolbars, menus).

---

## Responsabilidades

âœ… O que AccessDecision **FAZ**:
- Ser a **API Ãºnica** de decisÃ£o de acesso para Shell e Tools
- Consolidar regras de decisÃ£o na ordem determinÃ­stica: **auth â†’ flags â†’ rbac â†’ policy**
- Retornar negaÃ§Ã£o **explÃ­cita** com `denyReason` padronizado (sem negaÃ§Ã£o silenciosa)
- Evitar duplicaÃ§Ã£o de lÃ³gica de acesso em guards, navigation e componentes
- Permitir troubleshooting com razÃµes consistentes e mapeÃ¡veis para `@hub/error-model`

âŒ O que AccessDecision **NÃƒO FAZ**:
- NÃ£o autentica usuÃ¡rio (responsabilidade de `auth-session` + AuthGuard)
- NÃ£o realiza chamadas HTTP/IO (sem HttpClient obrigatÃ³rio)
- NÃ£o Ã© fonte de permissÃµes/policies (os dados vÃªm de adapters/ports externos)
- NÃ£o renderiza UI (somente lÃ³gica de decisÃ£o)
- NÃ£o oculta erro/negaÃ§Ã£o: decisÃµes devem ser sempre explÃ­citas

---

## Quando usar

Use **AccessDecisionService** quando:

1. **RouteGuards** (Shell e `/tools/*`) avaliam entrada em rota
2. **NavigationService** filtra menus/deep links por acesso
3. Telas/componentes verificam habilitaÃ§Ã£o de aÃ§Ãµes (UX gating) **sem reimplementar autorizaÃ§Ã£o**
4. Contexto muda (tenant/cliente/projeto/ambiente), exigindo recÃ¡lculo de decisÃ£o

**Quando NÃƒO usar**: Se vocÃª precisa apenas verificar se usuÃ¡rio estÃ¡ autenticado, use `auth-session.snapshot()` diretamente.

---

## Inputs e Outputs

### Inputs

| Input | Tipo | Fonte | DescriÃ§Ã£o |
|---|---|---|---|
| `AuthSession snapshot` | `SessionSnapshot` | `AuthSessionPort` | Estado autenticado + claims mÃ­nimas para avaliaÃ§Ã£o |
| `FeatureFlags state` | `isEnabled(key)` | `FeatureFlagsPort` | Verifica se feature estÃ¡ habilitada no contexto |
| `Permission (RBAC)` | `hasPermission()` | `PermissionRbacPort` | Resolve permissÃµes (adapter/port; nÃ£o hÃ¡ lib Nx obrigatÃ³ria neste workspace) |
| `Policy` | `evaluate()` | `PolicyEnginePort` | Avalia polÃ­ticas declarativas/ABAC (adapter/port; nÃ£o hÃ¡ lib Nx obrigatÃ³ria neste workspace) |
| `Decision request` | `AccessDecisionRequest` | Consumidor | featureKey, requiredPermission, policyKey, action, context, resource |

### Outputs

| Output | Tipo | DescriÃ§Ã£o |
|---|---|---|
| `AccessDecisionResult` | `{ action, allowed, denyReason? }` | Objeto determinÃ­stico: allowed + denyReason padronizado quando deny |
| API | `canEnter/canView/canExecute` | TrÃªs mÃ©todos pÃºblicos para decisÃ£o por tipo de aÃ§Ã£o |
| Observability (opcional) | Eventos | `access.allowed` / `access.denied` com reason e sem dados sensÃ­veis |

---

## Como usar

### InstalaÃ§Ã£o

```typescript

// Export structure:
// AccessDecisionService and types are exported from lib:
//   - access-decision.model.ts
//   - access-decision.service.ts

// Example import:
// import { AccessDecisionService, AccessDecisionDependencies, AccessDecisionRequest, AccessDecisionResult } from '@hub/access-decision';

### API PÃºblica

- `canEnter(request: AccessDecisionRequest): AccessDecisionResult`
- `canView(request: AccessDecisionRequest): AccessDecisionResult`
- `canExecute(request: AccessDecisionRequest): AccessDecisionResult`
- `watchDecisions(): void` _(stub â€” nÃ£o implementado; veja [LimitaÃ§Ãµes conhecidas](#limitaÃ§Ãµes-conhecidas))_

#### DenyReason codes

Padronizado para mapeamento 401/403/404:
- `unauthenticated`
- `forbidden`
- `flagOff`
- `notFound`
- `contextMissing`

> Nota: este pacote **nÃ£o expÃµe** um denyReason de â€œdependÃªncia ausenteâ€. 
> Se um port opcional (featureFlags/permissionRbac/policyEngine) estiver ausente **e** o request exigir a checagem (featureKey/requiredPermission/policyKey), o comportamento Ã© **fail-closed** retornando `forbidden`.

Importe no consumidor:

```typescript
import {
  AccessDecisionService,
  AccessDecisionDependencies,
  AccessDecisionRequest,
  AccessDecisionResult,
} from '@hub/access-decision';
```

### ConfiguraÃ§Ã£o bÃ¡sica

**1. Instanciar o service com dependÃªncias (ports):**

```typescript
import { AuthSessionPort } from '@hub/access-decision';

// Adapters sÃ£o fornecidos pelo Shell/Tool (ou por libs internas existentes no workspace).
import { MyAuthSessionAdapter } from './adapters/auth-session.adapter';
import { MyFeatureFlagsAdapter } from './adapters/feature-flags.adapter';
import { MyPermissionRbacAdapter } from './adapters/permission-rbac.adapter';
import { MyPolicyEngineAdapter } from './adapters/policy-engine.adapter';

const authSession: AuthSessionPort = new MyAuthSessionAdapter();
const featureFlags = new MyFeatureFlagsAdapter();
const permissionRbac = new MyPermissionRbacAdapter();
const policyEngine = new MyPolicyEngineAdapter();

const accessDecision = new AccessDecisionService({
  authSession,        // obrigatÃ³rio
  featureFlags,       // opcional
  permissionRbac,     // opcional
  policyEngine,       // opcional
  observability,      // opcional
});
```

**2. Usar em RouteGuard:**

```typescript
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private accessDecision: AccessDecisionService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const result = this.accessDecision.canEnter({
      featureKey: route.data['featureKey'],
      requiredPermission: route.data['permission'],
      policyKey: route.data['policy'],
    });

    if (!result.allowed) {
      console.warn('Access denied:', result.denyReason);
      // Redirect ou mostrar erro
    }

    return result.allowed;
  }
}
```

### Exemplos de uso

#### Exemplo 1: Verificar entrada em rota

```typescript
const result = accessDecision.canEnter({
  featureKey: 'global.reports',
  requiredPermission: 'reports:view',
});

if (result.allowed) {
  // Permite navegaÃ§Ã£o
  router.navigate(['/reports']);
} else {
  // Nega com reason
  console.log(result.denyReason); // 'unauthenticated' | 'flagOff' | 'forbidden' | ...
  showErrorMessage(result.denyReason);
}
```

#### Exemplo 2: Gating de aÃ§Ã£o (botÃ£o de export)

```typescript
const canExport = accessDecision.canExecute({
  featureKey: 'toolA.export',
  requiredPermission: 'export:run',
  policyKey: 'export.policy',
  context: { tenant: currentTenant },
  resource: 'doc:123',
});

// Habilitar/desabilitar botÃ£o
exportButton.disabled = !canExport.allowed;

// Mostrar tooltip explicativo
if (!canExport.allowed) {
  exportButton.title = getDenyReasonMessage(canExport.denyReason);
}
```

#### Exemplo 3: Filtrar menu por acesso

```typescript
const menuItems = [
  { label: 'Reports', route: '/reports', featureKey: 'global.reports' },
  { label: 'Admin', route: '/admin', requiredPermission: 'admin:manage' },
  { label: 'Export', route: '/export', policyKey: 'export.policy' },
];

const visibleItems = menuItems.filter(item => {
  const result = accessDecision.canView({
    featureKey: item.featureKey,
    requiredPermission: item.requiredPermission,
    policyKey: item.policyKey,
  });
  return result.allowed;
});
```

#### Exemplo 4: Recurso pÃºblico (sem autenticaÃ§Ã£o)

```typescript
const result = accessDecision.canView({
  requireAuthenticated: false, // permite acesso sem autenticaÃ§Ã£o
  featureKey: 'global.public-docs',
});

// Mesmo sem autenticaÃ§Ã£o, outras checagens ainda sÃ£o aplicadas
// Se feature estiver desabilitada, retorna denyReason: 'flagOff'
```

---

## API PÃºblica

### `canEnter(request: AccessDecisionRequest): AccessDecisionResult`

Verifica se usuÃ¡rio pode **entrar** em uma rota/mÃ³dulo.

**Uso tÃ­pico**: RouteGuards

```typescript
const result = accessDecision.canEnter({
  featureKey: 'toolA.billing',
  requiredPermission: 'billing:access',
  policyKey: 'tenant.boundary',
  context: { tenant: 'acme' },
});
```

### `canView(request: AccessDecisionRequest): AccessDecisionResult`

Verifica se usuÃ¡rio pode **visualizar** um recurso/dado.

**Uso tÃ­pico**: Filtros de menu, visibilidade de componentes

```typescript
const result = accessDecision.canView({
  featureKey: 'global.reports',
  requiredPermission: 'reports:read',
});
```

### `canExecute(request: AccessDecisionRequest): AccessDecisionResult`

Verifica se usuÃ¡rio pode **executar** uma aÃ§Ã£o.

**Uso tÃ­pico**: Habilitar/desabilitar botÃµes, toolbars

```typescript
const result = accessDecision.canExecute({
  featureKey: 'toolA.export',
  requiredPermission: 'export:run',
  policyKey: 'export.policy',
  context: { format: 'pdf' },
  resource: 'doc:123',
});
```

### `AccessDecisionRequest`

```typescript
interface AccessDecisionRequest {
  featureKey?: string;              // Chave da feature flag (ex: 'global.reports')
  requiredPermission?: string;      // PermissÃ£o necessÃ¡ria (ex: 'reports:view')
  policyKey?: string;               // Chave da policy (ex: 'tenant.boundary')
  context?: Record<string, unknown>; // Contexto para avaliaÃ§Ã£o de policy.
                                    // âš ï¸ Passar context: {} (objeto vazio) Ã© tratado como
                                    //    "contexto ausente" â†’ denyReason: 'contextMissing'.
                                    //    Omitir context completamente (undefined) nÃ£o aciona essa checagem.
  resource?: string;                // Recurso sendo acessado (ex: 'doc:123')
  requireAuthenticated?: boolean;   // Default: true. Se false, permite acesso sem autenticaÃ§Ã£o
}
```


### `AccessDecisionResult`

```typescript
interface AccessDecisionResult {
  action: 'enter' | 'view' | 'execute'; // Tipo de aÃ§Ã£o avaliada
  allowed: boolean;                     // true = permitido, false = negado
  denyReason?: AccessDenyReason;        // Sempre presente quando allowed: false
}

// Harmonizado com a spec:
type AccessDenyReason =
  | 'unauthenticated'    // UsuÃ¡rio nÃ£o autenticado
  | 'forbidden'          // PermissÃ£o negada (RBAC/policy) ou port exigido ausente
  | 'flagOff'            // Feature flag desabilitada
  | 'notFound'           // Recurso nÃ£o encontrado
  | 'contextMissing';    // Contexto necessÃ¡rio ausente
```

---


## Ordem de decisÃ£o (determinÃ­stica)

O service aplica checagens na seguinte ordem **fixa**:

```
1. âœ… AutenticaÃ§Ã£o (auth-session)
  â†“ Se nÃ£o autenticado e requireAuthenticated: true
  âŒ NEGA com denyReason: 'unauthenticated'

2. âœ… Feature habilitada (feature-flags)
  â†“ Se featureKey presente e featureFlags port ausente
  âŒ NEGA com denyReason: 'forbidden'
  â†“ Se featureKey presente e feature desabilitada
  âŒ NEGA com denyReason: 'flagOff'

3. âœ… PermissÃ£o presente (permission-rbac)
  â†“ Se requiredPermission presente e permissionRbac port ausente
  âŒ NEGA com denyReason: 'forbidden'
  â†“ Se requiredPermission presente e permissÃ£o negada
  âŒ NEGA com denyReason: 'forbidden'

4. âœ… Policy aprovada (policy-engine)
  â†“ Se policyKey presente e policyEngine port ausente
  âŒ NEGA com denyReason: 'forbidden'
  â†“ Se policyKey presente e policy nega
  âŒ NEGA com denyReason: 'forbidden'

âœ… PERMITE (allowed: true)
```

**Importante**: A primeira negaÃ§Ã£o encontrada **encerra** a avaliaÃ§Ã£o e retorna imediatamente com `denyReason` correspondente.

### Exemplo de precedÃªncia

```typescript
// CenÃ¡rio: UsuÃ¡rio nÃ£o autenticado + feature desabilitada
const result = accessDecision.canEnter({
  featureKey: 'toolA.export',
});

// Resultado: denyReason: 'unauthenticated'
// (auth vem ANTES de feature na ordem de checagem)
```

---


## DenyReason: Tipos e significados

| DenyReason         | Quando ocorre                                                      | AÃ§Ã£o recomendada                         |
|--------------------|-------------------------------------------------------------------|------------------------------------------|
| `unauthenticated`  | UsuÃ¡rio nÃ£o estÃ¡ autenticado e `requireAuthenticated: true`        | Redirecionar para login                  |
| `forbidden`        | PermissÃ£o negada (RBAC/policy) ou port exigido ausente             | Mostrar "sem permissÃ£o" ou "configuraÃ§Ã£o incompleta" |
| `flagOff`          | Feature flag estÃ¡ desabilitada no contexto atual                  | Ocultar funcionalidade ou mostrar aviso  |
| `notFound`         | Recurso nÃ£o encontrado                                            | Mostrar 404                              |
| `contextMissing`   | `context: {}` passado (objeto vazio) â€” omitir `context` pula a checagem | Garantir que `context` contenha ao menos uma chave, ou omiti-lo |


### Mapeamento para UI

```typescript
function getDenyReasonMessage(reason: AccessDenyReason): string {
  const messages = {
    unauthenticated: 'VocÃª precisa fazer login para acessar este recurso.',
    flagOff: 'Esta funcionalidade nÃ£o estÃ¡ disponÃ­vel no momento.',
    forbidden: 'VocÃª nÃ£o tem permissÃ£o para acessar este recurso.',
    notFound: 'Recurso nÃ£o encontrado.',
    contextMissing: 'Contexto necessÃ¡rio nÃ£o informado.',
  };
  return messages[reason] || 'Acesso negado.';
}
```

---

## Observability

O service pode registrar eventos de decisÃ£o via **ObservabilityPort** (opcional).

### Eventos emitidos

#### `access.allowed`

Emitido quando decisÃ£o Ã© **permitida**.

```typescript
{
  event: 'access.allowed',
  payload: {
    action: 'enter',
    featureKey: 'global.reports',
    requiredPermission: 'reports:view',
    policyKey: 'reports.read',
  }
}
```

**Nota**: Payload **nÃ£o contÃ©m** `session`, `claims`, `context` ou `resource` (dados sensÃ­veis).

#### `access.denied`

Emitido quando decisÃ£o Ã© **negada**.

```typescript
{
  event: 'access.denied',
  payload: {
    action: 'view',
    denyReason: 'forbidden',
  }
}
```

### ImplementaÃ§Ã£o de ObservabilityPort

```typescript
class MyObservabilityAdapter implements ObservabilityPort {
  track(event: string, payload: Record<string, unknown>): void {
    // Enviar para telemetria, logs, analytics
    console.log(`[Observability] ${event}`, payload);
    // Exemplo: Datadog, Application Insights, etc.
  }
}

const accessDecision = new AccessDecisionService({
  authSession,
  observability: new MyObservabilityAdapter(),
});
```

---

## Troubleshooting

### Problema: DecisÃ£o sempre retorna `denyReason: 'unauthenticated'`

**Causa**: `authSession.snapshot()` retorna `{ authenticated: false }`

**SoluÃ§Ã£o**:
1. Verificar se usuÃ¡rio fez login
2. Verificar se `AuthSessionPort` estÃ¡ corretamente implementado
3. Testar diretamente: `authSession.snapshot()` e validar resultado

### Problema: DecisÃ£o permite quando deveria negar

**Causa 1**: DependÃªncia opcional ausente (ex: `featureFlags: undefined`)

**SoluÃ§Ã£o**: Se `featureFlags` Ã© `undefined`, checagem de feature Ã© **pulada**. Passar implementaÃ§Ã£o real do port.

**Causa 2**: Ordem de checagens nÃ£o compreendida

**SoluÃ§Ã£o**: Revisar [Ordem de decisÃ£o](#ordem-de-decisÃ£o-determinÃ­stica). Primeira negaÃ§Ã£o encerra avaliaÃ§Ã£o.

### Problema: `denyReason` nÃ£o Ã© mapeado para mensagem de UI

**Causa**: Consumidor nÃ£o trata todos os casos de `AccessDenyReason`

**SoluÃ§Ã£o**: Implementar switch ou mapping para todos os valores canÃ´nicos:
```typescript
switch (result.denyReason) {
  case 'unauthenticated':    return 'FaÃ§a login';
  case 'flagOff':            return 'Funcionalidade indisponÃ­vel';
  case 'forbidden':          return 'Sem permissÃ£o / configuraÃ§Ã£o incompleta';
  case 'notFound':           return 'Recurso nÃ£o encontrado';
  case 'contextMissing':     return 'Contexto necessÃ¡rio nÃ£o informado';
}
```

### Problema: DecisÃ£o retorna `denyReason: 'contextMissing'` inesperadamente

**Causa**: `context` foi passado como objeto vazio `{}`.

A semÃ¢ntica atual do service Ã©:
- `context: {}` (objeto vazio presente) â†’ **nega** com `contextMissing`
- `context: undefined` / campo omitido â†’ checagem **pulada** (nÃ£o nega)

```typescript
// âŒ Nega com contextMissing
accessDecision.canEnter({ context: {} });

// âœ… Sem checagem de contexto
accessDecision.canEnter({});
accessDecision.canEnter({ context: { tenant: 'acme' } }); // contexto populado
```

**SoluÃ§Ã£o**: Ou popule `context` com os dados necessÃ¡rios antes de chamar o service, ou omita o campo se contexto nÃ£o for obrigatÃ³rio para aquela decisÃ£o.

> **Nota futura**: Uma flag explÃ­cita `requireContext?: boolean` estÃ¡ planejada para tornar esse contrato mais claro. AtÃ© lÃ¡, a regra acima Ã© o comportamento definitivo.

### Problema: Observability nÃ£o registra eventos

**Causa**: `observability` nÃ£o foi passado ao construtor ou port nÃ£o implementa `track()`

**SoluÃ§Ã£o**:
1. Verificar se `observability` estÃ¡ definido nas dependÃªncias
2. Testar diretamente: `observability.track('test', {})` e validar log

### Problema: Como testar sem implementar todos os ports?

**SoluÃ§Ã£o**: Usar mocks simples em testes:

```typescript
const mockAuthSession = {
  snapshot: () => ({ authenticated: true, claims: {} }),
};

const mockFeatureFlags = {
  isEnabled: () => true,
};

const service = new AccessDecisionService({
  authSession: mockAuthSession,
  featureFlags: mockFeatureFlags,
});
```

---

## Exemplos avanÃ§ados

### Exemplo 1: Cache local de decisÃµes

```typescript
class CachedAccessDecisionService {
  private cache = new Map<string, AccessDecisionResult>();

  constructor(private accessDecision: AccessDecisionService) {}

  canEnter(request: AccessDecisionRequest): AccessDecisionResult {
    const key = JSON.stringify(request);
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = this.accessDecision.canEnter(request);
    this.cache.set(key, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Chamar clearCache() quando contexto muda (tenant, cliente, etc.)
}
```

### Exemplo 2: Helper guard reutilizÃ¡vel

```typescript
@Injectable()
export class AccessDecisionGuard implements CanActivate {
  constructor(
    private accessDecision: AccessDecisionService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const result = this.accessDecision.canEnter({
      featureKey: route.data['featureKey'],
      requiredPermission: route.data['permission'],
      policyKey: route.data['policy'],
    });

    if (!result.allowed) {
      this.handleDeny(result.denyReason);
      return false;
    }

    return true;
  }

  private handleDeny(reason: AccessDenyReason): void {
    switch (reason) {
      case 'unauthenticated':
        this.router.navigate(['/auth/login']);
        break;
      case 'flagOff':
      case 'notFound':
        this.router.navigate(['/error/404']);
        break;
      case 'forbidden':
      case 'contextMissing':
        this.router.navigate(['/error/403']);
        break;
    }
  }
}

// Uso em rotas:
const routes: Routes = [
  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [AccessDecisionGuard],
    data: {
      featureKey: 'global.reports',
      permission: 'reports:view',
    },
  },
];
```

### Exemplo 3: Diretiva estrutural para gating de UI

```typescript
@Directive({
  selector: '[appCanExecute]',
})
export class CanExecuteDirective implements OnInit {
  @Input() appCanExecute!: AccessDecisionRequest;

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private accessDecision: AccessDecisionService
  ) {}

  ngOnInit(): void {
    const result = this.accessDecision.canExecute(this.appCanExecute);

    if (result.allowed) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}

// Uso em template:
// <button *appCanExecute="{ featureKey: 'toolA.export', requiredPermission: 'export:run' }">
//   Export
// </button>
```

---

## Testes

O componente possui **22 testes unitÃ¡rios** com **100% de cobertura**.

### Executar testes

```bash
# Todos os testes
npx jest libs/access-decision/src

# Com cobertura
npx jest libs/access-decision/src --coverage

# Via Nx
nx test access-decision
```

### Cobertura

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |     100 |      100 |     100 |     100 |
 ...ion.service.ts |     100 |      100 |     100 |     100 |
-------------------|---------|----------|---------|---------|
```

### Testes implementados

- âœ… canEnter/canView/canExecute com allow
- âœ… Deny por unauthenticated/flagOff/forbidden/notFound/contextMissing
- âœ… PrecedÃªncia completa (auth > flags > rbac > policy)
- âœ… Recursos pÃºblicos (requireAuthenticated: false)
- âœ… Observability (track allow/deny, sem PII)
- âœ… DependÃªncias opcionais ausentes (fallback seguro)
- âœ… ConsistÃªncia da API (canEnter/canView/canExecute)

---

## DependÃªncias

| DependÃªncia | Tipo | Por quÃª |
|---|---|---|
| `auth-session` | ObrigatÃ³ria | Fonte de sessÃ£o/claims mÃ­nimas para decidir acesso autenticado |
| `feature-flags` | Opcional | Verificar se capability/feature estÃ¡ habilitada no contexto atual |
| `error-model` | Recomendada | Padronizar mapeamento de denyReason e falhas de decisÃ£o |
| `PermissionRbacPort` | Opcional (port) | Resolver permissÃµes por role/claim (adapter fornecido pelo Shell/Tool) |
| `PolicyEnginePort` | Opcional (port) | Avaliar polÃ­ticas declarativas/ABAC para casos de contexto/recurso (adapter fornecido pelo Shell/Tool) |
| `ObservabilityPort` | Opcional (port) | Registrar eventos de allow/deny com reason, sem PII; pode ser adaptado a partir de contratos jÃ¡ existentes em `@hub/tool-data-access-sdk` ou `@hub/tool-plugin` |

### DependÃªncias opcionais: Comportamento

Quando uma dependÃªncia opcional estÃ¡ **ausente** (`undefined`):

| Port ausente | Request exige | Resultado |
|---|---|---|
| `featureFlags` | `featureKey` presente | âŒ Nega com `forbidden` |
| `permissionRbac` | `requiredPermission` presente | âŒ Nega com `forbidden` |
| `policyEngine` | `policyKey` presente | âŒ Nega com `forbidden` |

**Fail-closed**: Se a key estÃ¡ declarada mas o port estÃ¡ ausente, o serviÃ§o nega com `forbidden`. Isso Ã© intencional para evitar acesso silencioso por configuraÃ§Ã£o incorreta.

---


## LimitaÃ§Ãµes conhecidas

1. **API sÃ­ncrona**: Service nÃ£o suporta ports assÃ­ncronos. Se `authSession.snapshot()` ou outros ports dependerem de `Observable`/`Promise`, consumidor deve resolver antes de chamar `canEnter/canView/canExecute`.

2. **Sem cache interno**: Cada chamada reavalia completamente. Para RouteGuards frequentes, consumidor pode implementar [cache local](#exemplo-1-cache-local-de-decisÃµes) com invalidaÃ§Ã£o por context.

3. **Ordem fixa de precedÃªncia**: NÃ£o hÃ¡ configuraÃ§Ã£o para alterar ordem de checagens (sempre auth â†’ flags â†’ rbac â†’ policy).

4. **DecisÃ£o binÃ¡ria**: Resultado Ã© `allowed: true` ou `allowed: false` com `denyReason`. NÃ£o hÃ¡ suporte a decisÃµes parciais ou warnings.

5. **SessionSnapshot mutÃ¡vel**: `snapshot()` retorna objeto mutÃ¡vel. Consumer nÃ£o deve alterar `claims` apÃ³s receber snapshot.

6. **watchDecisions fora do contrato**: O mÃ©todo `watchDecisions(): void` existe no service mas **nÃ£o Ã© parte da API pÃºblica contratada** e nÃ£o tem implementaÃ§Ã£o. A decisÃ£o de design Ã© manter o core sÃ­ncrono e sem RxJS. Consumidores que precisem reatividade devem orquestrar externamente (ex.: reexecutar `canEnter/canView/canExecute` ao receber eventos de mudanÃ§a de sessÃ£o/contexto/flags).

---

## PrÃ³ximos passos

1. **IntegraÃ§Ã£o com error-model**: Mapear `denyReason` para mensagens padronizadas de UI
2. **Helper guards Angular**: Criar `CanActivate`/`CanActivateChild` que consomem AccessDecisionService
3. **Cache com invalidaÃ§Ã£o**: Implementar estratÃ©gia de cache local com TTL ou invalidaÃ§Ã£o por context
4. **Diretivas estruturais**: Criar `*appCanView`, `*appCanExecute` para gating de UI
5. **Testes end-to-end**: Validar integraÃ§Ã£o com auth-session, feature-flags, permission-rbac e policy-engine reais
6. **Playbook de troubleshooting**: Expandir guia com cenÃ¡rios reais de produÃ§Ã£o

---

## Contribuindo

Este componente segue a **Spec do Hub SaaP** e deve respeitar:
- âœ… 4 arquivos do `directoryModel` em `libs/access-decision/src/lib/`
- âœ… Ordem determinÃ­stica auth â†’ flags â†’ rbac â†’ policy
- âœ… NegaÃ§Ã£o explÃ­cita com `denyReason` padronizado
- âœ… Sem HttpClient/IO
- âœ… Testes com 100% de cobertura

Para mudanÃ§as, abrir PR com:
- AtualizaÃ§Ã£o de testes
- AtualizaÃ§Ã£o deste README
- ValidaÃ§Ã£o contra critÃ©rios de aceite da Spec

---

**VersÃ£o**: 1.0.0  
**Data**: 2026-02-20  
**Autor**: Hub SaaP Component Creator (hubsaap-doc-writer agent)

