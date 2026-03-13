# permission-rbac

## Descrição

Shared-lib de autorização **RBAC (Role-Based Access Control)** para o Hub-Saap.

Implementa o núcleo de RBAC no frontend:
- Normalização de roles/permissions vindas da sessão (ClaimsLite)
- Resolução de grants efetivos (com cache por sessão+contexto)
- Suporte a múltiplas estratégias: `claims-only`, `map-based`, `hybrid`
- APIs simples e determinísticas: `hasRole()`, `hasPermission()`, `explain()`

## Convenção de PermissionKey

Formato recomendado: `"scope.resource.action"`

Exemplos:
- `tool.pip.read` → Ler dados do PIP
- `tool.pip.write` → Editar dados do PIP
- `global.admin` → Admin global
- `feature.analytics.read` → Ler analytics

## Convenção de RoleKey

Formato recomendado: `"ROLE_NAME"` ou `"RoleName"`

Exemplos:
- `ADMIN`
- `PROJECT_MANAGER`
- `VIEWER`
- `PIP_EDITOR`

## Uso básico

```typescript
import { PermissionRbacService, ClaimsLite } from '@hub-saap/permission-rbac';

constructor(private rbac: PermissionRbacService) {}

// Configurar sessão
const claims: ClaimsLite = {
  sessionId: 'user-123',
  permissions: ['tool.pip.read', 'tool.project.write'],
  roles: ['VIEWER', 'EDITOR'],
};

this.rbac.setSession(claims);

// Checar role
if (this.rbac.hasRole('ADMIN')) {
  console.log('Usuário é admin');
}

// Checar permission
if (this.rbac.hasPermission('tool.pip.write')) {
  console.log('Usuário pode editar PIP');
}

// Explain decisão
const result = this.rbac.explain('tool.nonexistent.action');
console.log(result.code, result.message);
```

## Estratégias

### claims-only (padrão)

Permissões já vêm prontas no token/claims (JWT).

```typescript
const config: RbacConfig = {
  strategy: 'claims-only',
  enableCache: true,
};
```

### map-based

Permissões derivadas de roles usando um `PermissionMap` configurável.

```typescript
import { buildPermissionMap } from '@hub-saap/permission-rbac';

const map = buildPermissionMap({
  roles: [
    {
      key: 'VIEWER',
      permissions: ['tool.pip.read', 'global.read'],
    },
    {
      key: 'EDITOR',
      permissions: ['tool.pip.write'],
      extends: ['VIEWER'], // Herda permissões de VIEWER
    },
  ],
});

const config: RbacConfig = {
  strategy: 'map-based',
  enableCache: true,
};

const service = new PermissionRbacService(config, cache, map);
```

### hybrid

Combina `claims-only` + `map-based`.

```typescript
const config: RbacConfig = {
  strategy: 'hybrid',
  enableCache: true,
};
```

## Cache

O cache de grants é automático e invalidado em:
- Troca de sessão (`setSession`)
- Troca de contexto (`setContext`)

Limpar cache manualmente:

```typescript
this.rbac.clearSession();
```

## Explain

Use `explain()` para entender motivos de allow/deny (útil para debug):

```typescript
const result = this.rbac.explain('tool.pip.delete');

console.log(result.code); // 'granted' | 'missing-permission' | 'invalid-key' | ...
console.log(result.message);
console.log(result.details);
```

## Guardrails

- ❌ Sem HttpClient
- ❌ Sem acesso direto a storage de sessão
- ❌ Sem lógica de policy/ABAC (isso é `policy-engine`)
- ❌ Sem lógica de decisão final (isso é `access-decision`)
- ❌ Sem navegação/menu (isso é `navigation-service`)

## Integração

Este lib é consumido por:
- `access-decision` (combina RBAC + flags + policies)
- `access-layer` (orquestra sessão + contexto + decisões)
- Components/guards de UI (indiretamente via `access-decision`)

## Testes

Rodar testes:

```bash
npx nx test permission-rbac
```

## Responsabilidades

✅ Normalizar roles/permissions vindas da sessão
✅ Resolver permissões efetivas de forma determinística
✅ Expor APIs simples para checagem de permissão
✅ Suportar estratégia configurável (claims-only/map-based/hybrid)
✅ Suportar "explain" para debug (sem dados sensíveis)

## Não-responsabilidades

❌ Não decidir acesso final (isso é `access-decision`)
❌ Não controlar rotas/guards
❌ Não fazer chamadas HTTP
❌ Não persistir sessão
❌ Não interpretar regras ABAC/policies

## Documentação adicional

Consulte:
- `Spec/permission-rbac.spec.json` (especificação completa)
- `.github/instructions/access-layer-contracts.instructions.md`
- `.github/instructions/boundaries.instructions.md`
