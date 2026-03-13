# Hub-Saap - Portal de Ferramentas Unificado

**Versão:** 0.1.0  
**Framework:** Angular 17.3 + Nx 18.0  
**Status:** 🚧 Em desenvolvimento ativo

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Quick Start](#quick-start)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Arquitetura](#arquitetura)
- [Workflow de Desenvolvimento](#workflow-de-desenvolvimento)
- [Convenções](#convenções)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Hub-Saap** é um portal unificado que agrega múltiplas ferramentas (tools) em uma única interface consistente. O projeto segue uma arquitetura modular baseada em **Nx Monorepo** e **Angular Standalone Components**.

### Características Principais

- ✅ **Layout unificado** com 4 slots (Topbar, Sidebar, Content, RightPanel)
- ✅ **Bootstrap sequencial** (sessão → contexto → navegação)
- ✅ **Lazy loading** de tools por demanda
- ✅ **Contexto multi-tenant** (tenant/cliente/projeto)
- ✅ **Sistema de navegação dinâmico** baseado em permissões
- ✅ **Observabilidade** integrada (eventos, erros, métricas)

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Angular** | 17.3.0 | Framework frontend (Standalone Components) |
| **Nx** | 18.0.0 | Monorepo tooling + build optimization |
| **RxJS** | 7.8.0 | Reactive programming |
| **TypeScript** | 5.3.2 | Type safety |
| **Jest** | 29.4.3 | Unit testing |
| **SCSS** | - | Styling com CSS custom properties |

---

## 📁 Estrutura do Projeto

```
Hub-Saap/
├── apps/
│   └── shell/                          # Aplicação principal do Hub
│       ├── src/
│       │   ├── app/
│       │   │   ├── shell/
│       │   │   │   └── app-shell/      # Componente raiz do layout
│       │   │   ├── dashboard/          # Página inicial
│       │   │   ├── mocks/              # Services mock temporários
│       │   │   ├── app.component.ts    # Root component
│       │   │   ├── app.config.ts       # Providers configuration
│       │   │   └── app.routes.ts       # Rotas principais
│       │   ├── index.html
│       │   └── main.ts                 # Bootstrap entry point
│       ├── project.json                # Nx project config
│       └── tsconfig.json
│
├── libs/                               # (Futuro) Libs compartilhadas
│   ├── access-layer/                   # (Planejado) Session, Context, Navigation
│   ├── ui-layout/                      # (Planejado) Componentes de layout
│   └── shared/                         # (Planejado) Notification, Observability
│
├── Spec/                               # Especificações técnicas
│   └── app-shell-component.spec.ts
│
├── nx.json                             # Configuração Nx workspace
├── package.json                        # Dependências do projeto
├── tsconfig.base.json                  # TypeScript base config
└── README.md                           # Este arquivo
```

---

## 🚀 Quick Start

### **Pré-requisitos**

- Node.js 18.16+ 
- npm 9+

### **Instalação**

```bash
# 1. Clonar repositório
git clone <repo-url>
cd my-hub-project

# 2. Instalar dependências
npm install

# 3. Executar aplicação
npm start
```

A aplicação estará disponível em: **http://localhost:4200**

### **Primeiro Acesso**

Ao abrir a aplicação, você verá:
- **Loading** (~1 segundo) durante o bootstrap
- **Dashboard** com layout completo (Topbar + Sidebar + Content + RightPanel)
- **Usuário mock:** Maria Silva
- **Menu de navegação:** Dashboard, Ferramentas, Configurações

---

## 📜 Scripts Disponíveis

```bash
# Desenvolvimento
npm start                    # Inicia dev server (http://localhost:4200)
npx nx serve shell           # Comando Nx direto

# Build
npm run build                # Build de produção
npx nx build shell           # Build com Nx

# Testes
npm test                     # Executa testes unitários
npx nx test shell --watch    # Watch mode
npx nx test shell --coverage # Com cobertura

# Linting
npm run lint                 # Valida código com ESLint
npx nx lint shell

# Visualização
npx nx graph                 # Visualiza dependências do projeto
```

---

## 🏗️ Arquitetura

### **Camadas Lógicas**

```
┌─────────────────────────────────────────┐
│          Apps (Shell)                   │  ← UI & Orquestração
├─────────────────────────────────────────┤
│      Access Layer (Libs)                │  ← Session, Context, Navigation
├─────────────────────────────────────────┤
│      Shared Libs                        │  ← UI Layout, Notification, Observability
├─────────────────────────────────────────┤
│      API Backend                        │  ← REST APIs (fora do monorepo)
└─────────────────────────────────────────┘
```

### **Fluxo de Bootstrap**

```
1. User abre Hub
   ↓
2. AppShellComponent.ngOnInit()
   ↓
3. SessionService.restoreSession() → Valida token + usuário
   ↓
4. ContextService.restoreContext() → Carrega tenant/cliente/projeto
   ↓
5. NavigationService.getNavigation() → Monta menu baseado em permissões
   ↓
6. Layout renderiza 4 slots + router-outlet
   ↓
7. Usuário navega entre rotas
```

### **Componente AppShellComponent**

Responsável por:
- ✅ Compor layout com 4 slots
- ✅ Orquestrar bootstrap (sessão → contexto → navegação)
- ✅ Reagir a mudanças de contexto (rebuild de navegação)
- ✅ Exibir estados globais (loading, erro)

**NÃO é responsável por:**
- ❌ Chamadas HTTP diretas (delega aos services)
- ❌ Avaliar permissões (consome NavigationService)
- ❌ Montar menu localmente (renderiza dados do service)
- ❌ Conhecer rotas internas de tools

📖 **Documentação completa:** [apps/shell/src/app/shell/app-shell/README.md](apps/shell/src/app/shell/app-shell/README.md)

---

## 🔄 Workflow de Desenvolvimento

O projeto segue um **workflow multi-agent** para garantir qualidade e consistência:

### **Fase 1: Planejamento** (`hubsaap-planner`)
- Lê Spec do componente
- Gera plano de implementação em etapas
- Define riscos e checklist de conclusão

### **Fase 2: Implementação** (`hubsaap-implementer`)
- Cria arquivos (.ts, .html, .scss, .spec.ts)
- Implementa lógica conforme Spec
- Garante responsabilidades e não-responsabilidades

### **Fase 3: Validação** (`hubsaap-validator`)
- Valida contra acceptance criteria
- Verifica boundaries Nx
- Aprova ou solicita correções

### **Fase 4: Testes** (`hubsaap-test-writer`)
- Propõe cenários de teste adicionais
- Valida cobertura mínima
- Garante testes determinísticos

### **Fase 5: Documentação** (`hubsaap-doc-writer`)
- Gera documentação técnica
- Atualiza catálogo de componentes
- Cria guias de uso

---

## 📐 Convenções

### **Nomenclatura**

- **Componentes:** `PascalCase` + sufixo `Component` (ex: `AppShellComponent`)
- **Services:** `PascalCase` + sufixo `Service` (ex: `SessionService`)
- **Seletores:** prefixo `hub-` + `kebab-case` (ex: `hub-app-shell`)
- **Arquivos:** `kebab-case` + tipo (ex: `app-shell.component.ts`)

### **Estrutura de Arquivos**

Cada componente deve ter:
```
component-name/
├── component-name.component.ts       # Lógica
├── component-name.component.html     # Template
├── component-name.component.scss     # Estilos
├── component-name.component.spec.ts  # Testes
└── README.md                         # Documentação
```

### **Imports**

Sempre usar **Standalone Components** (sem NgModules):
```typescript
@Component({
  selector: 'hub-my-component',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ...],
  templateUrl: './my-component.component.html',
})
```

### **Memory Leak Prevention**

Sempre usar `takeUntilDestroyed` em subscriptions:
```typescript
private readonly destroyRef = inject(DestroyRef);

ngOnInit() {
  this.service.data$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(...);
}
```

---

## 🔧 Troubleshooting

### **Problema: "Cannot find module '@angular/core'"**

```bash
npm install
```

### **Problema: "nx: O termo 'nx' não é reconhecido"**

Use `npx`:
```bash
npx nx serve shell
```

### **Problema: Build falha com erro de budget**

Ajustar `project.json`:
```json
"budgets": [
  {
    "type": "anyComponentStyle",
    "maximumWarning": "6kb",
    "maximumError": "10kb"
  }
]
```

### **Problema: Testes falhando com timeout**

Usar `fakeAsync` + `tick`:
```typescript
it('teste exemplo', fakeAsync(() => {
  component.ngOnInit();
  tick(1000); // Aguardar delays dos mocks
  expect(component.isBootstrapComplete()).toBe(true);
}));
```

### **Problema: Aplicação não carrega (tela branca)**

1. Verificar console do navegador
2. Verificar se `npm start` rodou sem erros
3. Limpar cache: `rm -rf .angular dist node_modules && npm install`

---

## 📚 Documentação Adicional

- **[AppShellComponent](apps/shell/src/app/shell/app-shell/README.md)** - Componente raiz do layout
- **[Mocks](apps/shell/src/app/mocks/README.md)** - Services temporários e migration path
- **[docs/arquitetura/spec](spec/)** - Especificações técnicas dos componentes

---

## 📄 Licença

MIT License - Copyright (c) 2026

---

## 📧 Contato

**Equipe Hub-Saap**  
Slack: #hub-saap-dev  
Documentação: [Catálogo de Componentes]

---

**Última atualização:** 2026-02-11  
**Mantido por:** Equipe Hub-Saap

