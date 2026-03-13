# Tool Contract

Lib que define o **contrato reutilizável Tool↔Hub**: tipos, metadata, flags, permissions, routes e o **ToolContextAdapter** para desacoplar tools do modelo interno do Hub.

---

## 🎯 Objetivo

Fornecer um contrato tipado, versionável e estável para que:
- Tools sejam **plugáveis** no Hub sem acoplamento
- Tools publiquem seus metadados (menu, flags, permissions) de forma padronizada
- Hub consuma esses metadados sem conhecer implementação interna das Tools
- Tools recebam contexto/sessão/capabilities através do **ToolContextAdapter** (abstração estável)

---

## 📦 O que esta lib exporta

### 1. **Tool Contract Models** (`models/`)
Tipos do contrato publicado pela Tool:
- `ToolKey`: identificador único da tool (kebab-case)
- `ToolMenuMetadata`: estrutura de menu e deep links
- `ToolFeatureFlags`: mapa de feature flags com valores default
- `ToolPermissionMap`: declaração de permissões (scopes + actions)
- `ToolRouteData`: metadata adicional para rotas (guards, breadcrumbs)
- `ToolContract`: agregação completa do contrato

### 2. **Tool Context Adapter** (`adapter/`)
Adapter que traduz o contexto interno do Hub para um modelo estável consumível pelas Tools:
- `ToolContextAdapter`: serviço que expõe streams reativos (`toolContext$`, `capabilities$`)
- `ToolContext`: snapshot do contexto ativo (tenant/client/project + sessão)
- `ToolCapabilities`: flags e permissões efetivas da tool

### 3. **Validations** (`validation/`)
Helpers leves para validar consistência do contrato:
- `validateToolKey()`: valida formato do toolKey
- `validatePermissionKey()`: valida namespace de permissões
- `validateFeatureKey()`: valida namespace de features
- `validateDeepLink()`: valida paths relativos e referências
- `validateToolContract()`: valida contrato completo
- `generateAllPermissions()`: gera lista flat de permissões a partir de scopes

---

## 🚀 Como usar (Tool)

### Passo 1: Publicar o contrato da Tool

Crie um arquivo `tool.contract.ts` na raiz da sua tool:

```typescript
import { ToolContract } from '@hub-saap/tool-contract';

export const FINANCEIRO_CONTRACT: ToolContract = {
  toolKey: 'financeiro',
  contractVersion: '1.0.0',
  
  menu: {
    toolKey: 'financeiro',
    displayName: 'Financeiro',
    description: 'Gestão financeira completa',
    icon: 'dollar-sign',
    order: 10,
    menuItems: [
      {
        id: 'invoices',
        label: 'Faturas',
        path: 'invoices',
        icon: 'file-text',
        requiredPermissions: ['financeiro.invoices.read'],
      },
      {
        id: 'reports',
        label: 'Relatórios',
        path: 'reports',
        icon: 'bar-chart',
        requiredPermissions: ['financeiro.reports.read'],
      },
    ],
    deepLinks: [
      {
        id: 'create-invoice',
        path: 'invoices/create',
        label: 'Criar Fatura',
        requiredPermissions: ['financeiro.invoices.create'],
      },
    ],
  },
  
  featureFlags: {
    toolKey: 'financeiro',
    features: {
      'financeiro.new-invoice-flow': true,
      'financeiro.export-pdf': false,
    },
    featureDescriptions: {
      'financeiro.new-invoice-flow': 'Novo fluxo de criação de faturas',
      'financeiro.export-pdf': 'Exportação de relatórios em PDF',
    },
  },
  
  permissions: {
    toolKey: 'financeiro',
    scopes: [
      {
        scopeId: 'invoices',
        label: 'Faturas',
        actions: [
          { actionId: 'read', label: 'Visualizar' },
          { actionId: 'create', label: 'Criar' },
          { actionId: 'update', label: 'Editar' },
          { actionId: 'delete', label: 'Deletar' },
        ],
      },
      {
        scopeId: 'reports',
        label: 'Relatórios',
        actions: [
          { actionId: 'read', label: 'Visualizar' },
          { actionId: 'export', label: 'Exportar' },
        ],
      },
    ],
  },
};

// Gerar allPermissions automaticamente (evita inconsistência)
import { generateAllPermissions } from '@hub-saap/tool-contract';
FINANCEIRO_CONTRACT.permissions.allPermissions = generateAllPermissions(
  FINANCEIRO_CONTRACT.toolKey,
  FINANCEIRO_CONTRACT.permissions.scopes
);
```

### Passo 2: Consumir o ToolContextAdapter no ToolRootComponent

```typescript
import { Component, OnInit } from '@angular/core';
import { ToolContextAdapter, ToolContext, ToolCapabilities } from '@hub-saap/tool-contract';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-financeiro-root',
  template: `
    <div *ngIf="toolContext$ | async as context">
      <h1>Bem-vindo, {{ context.session.userName }}</h1>
      <p>Tenant: {{ context.tenantName }}</p>
      <p *ngIf="context.clientName">Cliente: {{ context.clientName }}</p>
    </div>
    
    <div *ngIf="capabilities$ | async as caps">
      <button *ngIf="caps.allowedActions.includes('financeiro.invoices.create')">
        Criar Fatura
      </button>
    </div>
  `,
})
export class FinanceiroRootComponent implements OnInit {
  toolContext$: Observable<ToolContext | null>;
  capabilities$: Observable<ToolCapabilities | null>;

  constructor(private toolContextAdapter: ToolContextAdapter) {
    this.toolContext$ = this.toolContextAdapter.toolContext$;
    this.capabilities$ = this.toolContextAdapter.capabilities$;
  }

  ngOnInit(): void {
    // Snapshot síncrono (para bootstrap)
    const snapshot = this.toolContextAdapter.getSnapshot();
    if (snapshot) {
      console.log('[Financeiro] Tool bootstrapped:', snapshot);
    }
  }
}
```

### Passo 3: Validar o contrato (em dev/test)

```typescript
import { validateToolContract } from '@hub-saap/tool-contract';
import { FINANCEIRO_CONTRACT } from './tool.contract';

const validation = validateToolContract(FINANCEIRO_CONTRACT);

if (!validation.isValid) {
  console.error('[Financeiro] Contrato inválido:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('[Financeiro] Avisos:', validation.warnings);
}
```

---

## 🧪 Testes

Execute os testes unitários:

```bash
nx test tool-contract
```

---

## 🎓 Conceitos importantes

### 1. **Keys namespaceadas**
- **ToolKey**: `kebab-case`, lowercase, sem espaços (ex: `financeiro`, `rh-core`)
- **PermissionKey**: `${toolKey}.${scope}.${action}` (ex: `financeiro.invoices.create`)
- **FeatureKey**: `${toolKey}.${featureName}` (ex: `financeiro.new-invoice-flow`)

### 2. **Paths relativos (DeepLinks)**
- DeepLinks devem ter paths **relativos** à rota base da tool
- ❌ Errado: `/financeiro/invoices/create`
- ✅ Correto: `invoices/create`

### 3. **Imutabilidade**
- `ToolContext` e `ToolCapabilities` são snapshots imutáveis
- Tools **não devem modificar** o contexto do Hub
- Use streams reativos para reagir a mudanças

### 4. **Versionamento**
- `contractVersion`: versão do contrato (ex: `1.0.0`)
- Permite evolução sem quebrar tools existentes
- Campos **opcionais** facilitam backward compatibility

---

## 🔒 Segurança

### Dados sensíveis
- `ToolContext` **não contém tokens** ou dados sensíveis completos
- Apenas IDs e claims essenciais (userId, tenantId, roles)
- Tools **não implementam autenticação** (delegam para Access Layer)

### Decisões de acesso
- Tools **não decidem** permissões (apenas consomem `capabilities$`)
- Decisões são centralizadas no **Access Decision Service**
- Tools usam `allowedActions` para habilitar/desabilitar UI

---

## 🛠️ Troubleshooting

### Erro: "ToolKey deve conter apenas letras minúsculas, números e hífens"
- Use kebab-case: `financeiro`, `rh-core`, `audit-trail`
- ❌ Evite: `Financeiro`, `financeiro_tool`, `financeiro.tool`

### Warning: "DeepLink referencia permissão não declarada"
- Certifique-se de que `requiredPermissions` estão em `permissions.allPermissions`
- Use `generateAllPermissions()` para evitar inconsistências

### Erro: "DeepLink path deve ser relativo"
- Remova a barra inicial: `invoices/create` (não `/invoices/create`)

### Tools não recebem contexto atualizado
- Verifique se `ToolContextAdapter` está injetado via DI (não instanciado manualmente)
- Verifique se há erros no console (serviços do Access Layer podem não estar disponíveis)

---

## 📚 Próximos passos

1. **Implementar Access Layer real** (session, context, feature-flags, access-decision)
2. **Implementar ToolRegistry** no Hub para consumir contratos publicados
3. **Criar tax-map** completa usando este contrato
4. **Documentar padrões de UI** (guards, breadcrumbs, menu dinâmico)

---

## 🔗 Links relacionados

- [Blueprint Core](../../.github/instructions/blueprint-core.instructions.md)
- [Access Layer Contracts](../../.github/instructions/access-layer-contracts.instructions.md)
- [Tool Plugin Contract](../../.github/instructions/tool-contract.instructions.md)
