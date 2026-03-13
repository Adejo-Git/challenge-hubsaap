# AppShellComponent

**Versão:** 1.0.0  
**Path:** `apps/shell/src/app/shell/app-shell/`  
**Tipo:** Component (Frontend)  
**Complexidade:** 2/5

---

## 1. Resumo do componente

O **AppShellComponent** é o componente raiz do Hub-Saap. Define a estrutura visual principal da aplicação através de 4 slots (Topbar, Sidebar, Content, RightPanel) e orquestra o bootstrap inicial sequencial: sessão → contexto → navegação. Reage automaticamente a mudanças de contexto (ex: troca de tenant/cliente/projeto) reconstruindo menus e visibilidade sem recarregar a página.

**Quando executa:**
- Ao abrir o Hub pela primeira vez (rota inicial)
- Ao restaurar sessão/contexto (bootstrap) para montar navegação
- Ao trocar contexto para reconstruir menus/visibilidade
- Ao ocorrer login/logout/expiração de sessão

---

## 2. Responsabilidades

### ✅ O que o componente FAZ:
1. **Compor o layout do Hub** e manter consistência visual entre páginas e tools
2. **Orquestrar bootstrap** em sequência sem assumir responsabilidades da Access Layer:
   - Restaurar sessão via `SessionService`
   - Restaurar contexto via `ContextService`
   - Solicitar navegação via `NavigationService`
3. **Renderizar menu/breadcrumbs** exclusivamente do `NavigationService` (não monta localmente)
4. **Reagir a troca de contexto** reconstruindo navegação sem refresh
5. **Exibir estados globais:** loading, erro crítico, acesso negado

### ❌ O que o componente NÃO FAZ:
1. **Não executa chamadas HTTP** diretamente (sem `HttpClient` no componente)
2. **Não avalia permissões/policies** (não chama `PermissionService`/`PolicyEngine`)
3. **Não decide visibilidade de menu** localmente (delega ao `NavigationService`)
4. **Não conhece detalhes de tools** (rotas internas, estados ou APIs das tools)
5. **Não concentra lógica de negócio** (apenas orquestra e compõe UI)

---

## 3. Inputs e Outputs

### **Inputs (Serviços Injetados)**

| Serviço | Origem | Propósito |
|---------|--------|-----------|
| `SessionService` | Access Layer | Estado de sessão (usuário, claims/roles, token) |
| `ContextService` | Access Layer | Contexto ativo (tenant/cliente/projeto) + mudanças reativas |
| `NavigationService` | Access Layer | Árvore de navegação segura baseada em `AccessDecision` |
| `NotificationService` | Shared Libs | Fonte agregada de notificações para NotificationCenter |
| `ObservabilityService` | Shared Libs | Registro de eventos, erros e métricas |

> **⚠️ Nota:** Atualmente usa mocks (`*ServiceMock`). Substituir por services reais quando libs estiverem disponíveis.

### **Outputs (Estados e Slots Renderizados)**

| Output | Tipo | Descrição |
|--------|------|-----------|
| **Topbar** | Slot | Exibe usuário atual e contexto ativo |
| **Sidebar** | Slot | Renderiza menu de navegação do `NavigationService` |
| **Content** | Slot | `<router-outlet>` para rotas do Shell e `/tools/*` (lazy) |
| **RightPanel** | Slot | NotificationCenter e widgets laterais |
| **Estados globais** | Signals | `isLoading`, `hasError`, `isBootstrapComplete` |

### **Signals Públicos**

```typescript
readonly isLoading = signal(true);              // Loading durante bootstrap
readonly hasError = signal(false);              // Erro crítico detectado
readonly errorMessage = signal<string | null>(null); // Mensagem de erro
readonly isBootstrapComplete = signal(false);   // Bootstrap finalizado
readonly currentUser = signal<any>(null);       // Dados do usuário logado
readonly activeContext = signal<any>(null);     // Contexto ativo (tenant/cliente)
readonly navigationTree = signal<any[]>([]);    // Árvore de navegação
readonly notifications = signal<any[]>([]);     // Lista de notificações
```

---

## 4. Como usar

### **4.1. Integração no App Root**

```typescript
// apps/shell/src/app/app.component.ts
import { Component } from '@angular/core';
import { AppShellComponent } from './shell/app-shell/app-shell.component';

@Component({
  selector: 'hub-root',
  standalone: true,
  imports: [AppShellComponent],
  template: '<hub-app-shell></hub-app-shell>',
})
export class AppComponent {}
```

### **4.2. Configurar Rotas**

```typescript
// apps/shell/src/app/app.routes.ts
import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component')
      .then(m => m.DashboardComponent) 
  },
  { 
    path: 'tools', 
    loadChildren: () => import('./tools/tool.routes')
      .then(m => m.toolRoutes) 
  },
];
```

### **4.3. Executar a Aplicação**

```bash
# Instalar dependências
npm install

# Desenvolvimento
npx nx serve shell

# Build de produção
npx nx build shell

# Testes
npx nx test shell
```

---

## 5. Estrutura de Arquivos

```
apps/shell/src/app/shell/app-shell/
├── app-shell.component.ts       - Lógica e orquestração
├── app-shell.component.html     - Template com 4 slots
├── app-shell.component.scss     - Layout Grid + tokens CSS
├── app-shell.component.spec.ts  - Testes unitários (17 testes)
└── README.md                    - Esta documentação
```

### Componentes relacionados (catálogo)

- `apps/shell/src/app/shell/notifications/notification-center/README.md`
- `apps/shell/src/app/shell/notifications/notification-center/notification-contract.guide.md`
- `apps/shell/src/app/shell/notifications/notification-center/troubleshooting.playbook.md`

---

## 6. Próximos Passos

1. **Instalar dependências:** `npm install`
2. **Executar aplicação:** `npx nx serve shell`
3. **Validar build:** `npx nx build shell`
4. **Executar testes:** `npx nx test shell`
5. **Substituir mocks** por services reais quando disponíveis

---

**Documentação completa:** Ver README.md na raiz do projeto  
**Última atualização:** 2026-02-11
