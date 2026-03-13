# ROUTING GUIDE - Como Registrar uma Nova Tool

## Pré-requisitos

Antes de registrar uma tool em `/tools/*`, certifique-se que:

1. ✅ Tool está desenvolvida com `AppToolRootComponent` ou `ToolModule`
2. ✅ Tool tem contrato implementado (ToolContract)
3. ✅ Tool é lazy-loadable (usa `loadChildren` ou `loadComponent`)
4. ✅ Tool metadados estão registrados em `ToolRegistry`
5. ✅ Tool feature flag está configurada (se aplicável)
6. ✅ Permissões estão mapeadas em `PermissionMap` (se aplicável)

## Registro da Tool no ToolRegistry

### Passo 1: Definir Tool Metadata

Crie/atualize `libs/access/tool-registry.service.ts`:

```typescript
export const TOOL_REGISTRY: ToolMetadata[] = [
  {
    toolKey: 'analytics',
    name: 'Analytics',
    description: 'Análise de dados e relatórios',
    module: 'AnalyticsToolModule',
    lazyPath: 'libs/tools/analytics',
    requiredPermissions: ['analytics:view'],
    featureFlag: 'tool_analytics',
    environment: ['dev', 'staging', 'prod'],
  },
];
```

### Passo 2: Registrar Rota no `shell-routes.ts`

A rota já está configurada como catch-all em `/tools/:toolKey`:

```typescript
{
  path: 'tools',
  children: [
    {
      path: ':toolKey',
      loadChildren: () =>
        import('./tool-routes').then((m) => m.toolChildRoutes),
    },
  ],
},
```

**Não é necessário registrar cada tool individualmente.** O guard validará a tool dinâmicamente.

### Passo 3: Implementar Tool Root Component

Sua tool deve exportar um `AppToolRootComponent` do lado lazy:

**`libs/tools/analytics/index.ts`:**

```typescript
export const ANALYTICS_ROUTES = [
  {
    path: '',
    component: AnalyticsRootComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AnalyticsDashboardComponent },
      { path: 'reports', component: AnalyticsReportsComponent },
    ],
  },
];
```

### Passo 4: Configurar Feature Flag (se aplicável)

Adicione ao `FeatureFlagService`:

```typescript
{
  key: 'tool_analytics',
  name: 'Tool Analytics',
  default: true,
  environments: {
    dev: true,
    staging: true,
    prod: false, // Desabilitado em produção inicialmente
  },
}
```

### Passo 5: Mapear Permissões (se aplicável)

Adicione ao `PermissionMap`:

```typescript
{
  toolKey: 'analytics',
  requiredPermissions: ['analytics:view'],
  actions: [
    { action: 'view', permission: 'analytics:view' },
    { action: 'export', permission: 'analytics:export' },
    { action: 'delete', permission: 'analytics:delete' },
  ],
}
```

## Fluxo de Validação no Guard

Quando o usuário navega para `/tools/analytics`:

```
1. AuthGuard valida SessionService
   └─ Se sem token: redireciona para /login

2. toolGuard extrai 'analytics' de route.params.toolKey
   └─ Se não tiver toolKey: redireciona para /error/404

3. toolGuard valida ToolRegistry
   └─ Se 'analytics' não está registrado: redireciona para /error/404

4. toolGuard valida FeatureFlagService
   └─ Se 'tool_analytics' está disabled: redireciona para /error/404

5. toolGuard valida AccessDecisionService
   └─ Se usuário não tem permissão: redireciona para /error/403

6. loadChildren dispara e carrega AnalyticsModule
   └─ Tool renderizada no slot Content
```

## Exemplo Completo: Registrar "Reports" Tool

### 1. Tool Metadata

```typescript
// libs/access/tool-registry.service.ts
{
  toolKey: 'reports',
  name: 'Reports & Dashboards',
  description: 'Crie e gerencie relatórios customizados',
  lazyPath: 'libs/tools/reports',
  requiredPermissions: ['reports:view'],
  featureFlag: 'tool_reports',
  environment: ['dev', 'staging', 'prod'],
}
```

### 2. Feature Flag

```typescript
// libs/feature-flags/feature-flags.service.ts
{
  key: 'tool_reports',
  name: 'Tool Reports',
  default: true,
  environments: {
    dev: true,
    staging: true,
    prod: true,
  },
}
```

### 3. Permission Map

```typescript
// libs/access/permission-map.service.ts
{
  toolKey: 'reports',
  requiredPermissions: ['reports:view'],
  actions: [
    { action: 'view', permission: 'reports:view' },
    { action: 'create', permission: 'reports:create' },
    { action: 'edit', permission: 'reports:edit' },
    { action: 'delete', permission: 'reports:delete' },
    { action: 'export', permission: 'reports:export' },
  ],
}
```

### 4. Tool Root Component

```typescript
// libs/tools/reports/src/lib/reports-root/reports-root.component.ts
@Component({
  selector: 'hub-reports-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class ReportsRootComponent {}

export const REPORTS_ROUTES = [
  {
    path: '',
    component: ReportsRootComponent,
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ReportsListComponent },
      { path: 'create', component: ReportsCreateComponent },
      { path: ':reportId', component: ReportsDetailComponent },
    ],
  },
];
```

### 5. Lazy Load no Router

A rota `/tools/reports` será automaticamente resolvida pelos guards e loadChildren.

## Validação da Tool

### Checklist Pré-Merge

- [ ] ToolKey único (sem conflito com outra tool)
- [ ] Metadata registrada em ToolRegistry
- [ ] Feature flag configurada
- [ ] Permissões mapeadas
- [ ] Tool Root Component exportado corretamente
- [ ] Lazy route testada localmente
- [ ] Guards validados (teste bypass por URL)
- [ ] Testes unitários passando
- [ ] Lint passando (`nx lint`)
- [ ] Build passando (`nx build`)
- [ ] Code review aprovado

## Troubleshooting

### "Tool carrega como 404 mas está registrada"

Verifique:
- [ ] ToolKey na URL matches exatamente (case-sensitive)
- [ ] Feature flag não está disabled
- [ ] Usuário tem permissão (RBAC)
- [ ] Não há erro no `console.error` do guard (verifique ToolRegistry)

### "Tool carrega como 403"

Significa: Tool existe, está habilitada, mas usuário não tem permissão.

Verifique:
- [ ] Usuário tem role com permissão `tool_*:view`
- [ ] PermissionMap está corretamente configurado
- [ ] AccessDecisionService retorna `allow` para usuário+contexto

### "Lazy load é lento"

Considere:
- [ ] Bundle da tool é muito grande? Divida em chunks
- [ ] Dependências externas não otimizadas? Use tree-shaking
- [ ] Network lento? Adicione loading skeleton com `RouterOutlet`
- [ ] Monitor com `router.events` e Performance API

### "Tool desaparece após context switch"

Pode ser:
- [ ] Contexto novo não tem a tool habilitada (feature flag)
- [ ] Contexto novo não tem permissão para a tool
- [ ] AccessDecisionService foi recalculado e negou acesso

Solução:
- Guardar state de navegação antes de context switch
- Revalidar rotas após context change
- Redirecionar para home se rota ficar inválida

## Recursos Relacionados

- [Spec: RouterToolRoutes](../../../Spec/router-tool-routes.spec.json)
- [Spec: ToolContract](../../../Spec/tool-contract.spec.json)
- [Spec: ToolRegistry](../../../Spec/tool-registry.spec.json)
- [README: Router](./README.md)
