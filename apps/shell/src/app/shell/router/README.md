# Router & Tool Routes (RouterToolRoutes)

## Overview

O módulo **RouterToolRoutes** centraliza a configuração de roteamento do Hub-Saap, definindo:

- **Rotas base** do Shell (dashboard, catálogo, docs)
- **Rota `/tools/*`** para lazy loading de tools
- **Guards** para proteção de autenticação e autorização
- **Fallback** 401/403/404 consistente
- **Observabilidade** de eventos de navegação

## Estrutura de Arquivos

```
apps/shell/src/app/shell/router/
├── shell-routes.ts          # Rotas base do Shell + /tools/*
├── tool-routes.ts            # Lazy routes das tools + guards
├── router-events.ts           # Bridge para observabilidade
├── router.spec.ts             # Testes de roteamento
└── README.md                  # Este arquivo
```

## Componentes Principais

### 1. `shell-routes.ts`

Define as rotas base hospedadas no `AppShellComponent`:

```typescript
export const shellRoutes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'dashboard', loadComponent: () => ... }, // Home
      { path: 'tools', children: [...] },              // Tools lazy
      { path: 'error/:code', children: [...] },        // Error pages
      { path: '**', redirectTo: '/error/404' }        // Fallback
    ]
  }
];
```

**Convenções:**
- Todas as rotas filhas carregam no slot `Content` do AppShellComponent
- `/tools/:toolKey` é a rota padrão para lazy loading
- Wildcard redireciona para 404

### 2. `tool-routes.ts`

Implementa lazy loading de tools com proteção:

```typescript
export const toolChildRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, toolGuard],  // ← Proteção
    loadChildren: () => toolModule         // ← Lazy load
  }
];
```

**Guards aplicados:**
- `authGuard`: valida autenticação (SessionService)
- `toolGuard`: valida tool existência, flag e acesso (AccessDecision)

**Fallback:**
- 401: sessão inválida (AuthGuard)
- 403: sem permissão (toolGuard)
- 404: tool inexistente ou desabilitada (toolGuard)

### 3. `router-events.ts`

Bridge entre Router e serviços de observabilidade:

```typescript
setupRouterEvents() {
  router.events
    .pipe(filter(...))
    .subscribe((event) => {
      // NavigationStart → 'navigation_started'
      // NavigationEnd → 'navigation_completed'
      // NavigationError → 'navigation_error'
    });
}
```

**Deve ser chamado no ngOnInit do AppShellComponent:**

```typescript
ngOnInit() {
  setupRouterEvents();  // ← Aqui
  this.executeBootstrap();
}
```

### 4. `router.spec.ts`

Testes mínimos cobrindo:
- ✅ Rotas base funcionam
- ✅ Lazy loading de tools
- ✅ Guards bloqueiam acesso indevido
- ✅ Fallback 401/403/404 coerente
- ✅ Eventos de navegação publicados

## Integração no AppShellComponent

Adicione ao `AppShellComponent.ngOnInit()`:

```typescript
import { setupRouterEvents } from './router/router-events';

export class AppShellComponent implements OnInit {
  ngOnInit(): void {
    setupRouterEvents();  // ← Inicializa listeners
    this.executeBootstrap();
  }
}
```

## Integração no Bootstrap

Configure as rotas no `main.ts` ou `app.routes.ts`:

```typescript
import { shellRoutes } from './shell/router/shell-routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(shellRoutes),  // ← Hier
    // ... outros providers
  ]
});
```

## Fluxo de Navegação Típico

```
Usuário clica em link para /tools/analytics
         ↓
Router inicia NavigationStart
         ↓
canActivate: authGuard
  └─ Valida SessionService
  └─ Se falho: redireciona para /login
         ↓
canActivate: toolGuard
  └─ Valida ToolRegistry (existe?)
  └─ Valida FeatureFlagService (habilitada?)
  └─ Valida AccessDecision (tem acesso?)
  └─ Se falho: redireciona para /error/404 ou /error/403
         ↓
loadChildren: carrega ToolModule dinamicamente
         ↓
Router finaliza NavigationEnd
         ↓
setupRouterEvents() publica 'navigation_completed'
         ↓
NavigationService atualiza breadcrumbs
         ↓
Componente renderizado no slot Content
```

## Casos de Boundary

### ✅ Será Tratado Aqui
- Roteamento base do Shell
- Lazy loading de tools
- Proteção de rota por AuthGuard + Route Guards
- Fallback 401/403/404
- Publicação de eventos para observabilidade

### ❌ NÃO é Responsabilidade
- Autenticação de usuário (SessionService)
- Avaliação de permissões (AccessDecisionService)
- Menu/breadcrumbs (NavigationService)
- Carregamento de dados (Tool Data Access SDKs)

## Próximas Etapas

1. **Code Review**: Validar guards sem chamadas HTTP diretas
2. **Testes E2E**: Testar navegação real com tools carregadas
3. **Integração com Access Layer**: Substituir mocks por services reais
4. **Documentação de Contrato**: Guia "Como registrar uma nova tool"

## Troubleshooting

### "Cannot find module for tool X"

Verifique:
1. Tool está registrada no ToolRegistry
2. `toolKey` na URL matches exatamente o nome registrado
3. `loadChildren` aponta para o módulo/componente correto

### "Redirect loop 403 ↔ 404"

Evite:
- Guard redirecionando para rota que dispara o mesmo guard
- Use 403 para "sem permissão" e 404 para "não encontrado"

### "Tool carrega lentamente"

Considere:
- Bundle muito grande? Use `rxjs/operators` lazy-loaded
- Network lento? Adicione loading skeleton antes do lazy load
- Monitor com `router.events` + `PerformanceObserver`

## Recursos Relacionados

- [Spec: RouterToolRoutes](../../../Spec/router-tool-routes.spec.json)
- [Spec: RouteGuards](../../../Spec/route-guards.spec.json)
- [Arquitetura: Distributed Architecture](../../../.github/instructions/distributed-architecture.instructions.md)
