# Example Tool

Tool de exemplo que demonstra o padrão ToolRoutes do Hub SaaP.

## Estrutura de Rotas

Esta tool implementa o padrão ToolRoutes conforme especificado em `Spec/tool-routes.spec.json`.

### Rotas Internas

Todas as rotas internas estão sob `/tools/tax-map/` e são children de `ToolRootComponent`:

- `/tools/tax-map` → Redirect para `/tools/tax-map/home`
- `/tools/tax-map/home` → Página inicial (default)
- `/tools/tax-map/dashboard` → Dashboard
- `/tools/tax-map/settings` → Configurações
- `/tools/tax-map/details/:id` → Detalhes (com parâmetro)
- `/tools/tax-map/**` → NotFound interno (fallback)

### Metadados de Rota (route.data)

Cada rota possui metadados tipados via `ToolRouteData`:

```typescript
interface ToolRouteData {
  title: string;
  featureKey?: string;
  navGroup?: string;
  breadcrumbs?: string[];
  icon?: string;
  hidden?: boolean;
}
```

### Componentes

- **ToolRootComponent**: Container raiz com `<router-outlet>` para children
- **HomeComponent**: Página inicial (rota default)
- **DashboardComponent**: Página de dashboard
- **SettingsComponent**: Página de configurações
- **DetailsComponent**: Página de detalhes com parâmetro `:id`
- **NotFoundInternalComponent**: Fallback interno para rotas não encontradas

### Helpers

```typescript
// Extrair dados de uma rota
const data = getRouteData(route);

// Listar rotas navegáveis (exclui hidden, redirect, fallback)
const navigable = getNavigableRoutes();
```

## Princípios de Design

1. **Children Routes**: Todas as rotas internas são children de ToolRootComponent
2. **Rota Default**: Redirect automático de `''` para `'home'`
3. **Fallback Interno**: Rota `**` para NotFound interno (não confundir com 404 do Hub)
4. **Sem IO em Rotas**: Nenhuma rota faz HttpClient ou IO direto
5. **Metadados Tipados**: `route.data` segue interface `ToolRouteData`
6. **Lazy Loading**: Todos os componentes usam `loadComponent` para lazy loading

## Testes

Os testes em `tool.routes.spec.ts` validam:

- Estrutura correta (root + children)
- Rota default presente e funcional
- Fallback interno presente
- Metadados tipados em todas as rotas
- Sem loops de redirect
- Sem IO/HttpClient em rotas

Executar testes:

```bash
nx test tax-map
```

## Integração com Hub

O Hub carrega esta tool via lazy loading em `/tools/tax-map` usando o contrato do ToolModule.

O Hub NÃO conhece as rotas internas — ele apenas carrega o ToolModule e o ToolRootComponent.

As rotas internas são gerenciadas exclusivamente pela própria tool.

## Convenções

- Rotas navegáveis devem ter `featureKey` para feature flags
- Rotas de detalhes/auxiliares devem ter `hidden: true`
- Primeira rota child deve ser redirect para página default
- Última rota child deve ser fallback `**`
- Nenhuma rota deve ter `resolve` com IO pesado

## Próximos Passos

Para criar uma nova tool seguindo este padrão:

1. Copiar estrutura de `tax-map`
2. Renomear paths e componentes
3. Atualizar `TOOL_ROUTES` com rotas específicas da tool
4. Implementar páginas internas conforme necessário
5. Executar testes para validar integridade
