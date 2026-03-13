# NavigationService - Access Layer

## Visão Geral

O **NavigationService** é a facade central do Access Layer responsável por fornecer navegação segura, determinística e reativa para o Hub SaaP. Ele constrói e mantém a árvore de menu/breadcrumbs/active item a partir do **ToolRegistry** e **AccessDecisionService**, reagindo automaticamente a mudanças de sessão, contexto, feature flags e eventos do Router.

### 🎯 Propósito

- **Fonte única da verdade** para navegação no Hub (menu, breadcrumbs, item ativo)
- **Consistência** entre o que aparece no menu e o que as rotas realmente permitem
- **Reatividade** automática a mudanças de sessão/contexto/flags
- **Determinismo** - mesma entrada produz sempre a mesma árvore de navegação
- **Anti-bypass UX** - menu mostra apenas itens que o usuário pode realmente acessar

---

## 📂 Estrutura do Módulo

O módulo de navegação é composto por 9 arquivos TypeScript:

```
libs/access-layer/src/lib/navigation/
├── navigation.service.ts       # Service principal (orquestrador)
├── navigation.model.ts         # Tipos: NavTree, NavGroup, NavItem, Breadcrumb
├── navigation.builder.ts       # Constrói árvore base (Shell + Tools)
├── navigation.filter.ts        # Filtra por AccessDecision + status
├── navigation.breadcrumbs.ts   # Resolve breadcrumbs por URL
├── navigation.active.ts        # Resolve item ativo por URL
├── navigation.util.ts          # Helpers: normalizeUrl, matching, etc.
├── navigation.spec.ts          # 54 testes (determinismo, rebuild, breadcrumbs)
└── index.ts                    # Exports públicos
```

### Responsabilidades por Arquivo

| Arquivo | Responsabilidade |
|---------|------------------|
| **navigation.service.ts** | Orquestra builder+filter+resolvers, expõe streams reativas (menu$/breadcrumbs$/activeItem$), reage a Router/Context/Session |
| **navigation.model.ts** | Define tipos: NavTree, NavGroup, NavItem, Breadcrumb, NavigationSnapshot, NavigationConfig |
| **navigation.builder.ts** | Constrói árvore base (itens fixos do Shell + tools do ToolRegistry), ordena/agrupa, **NÃO filtra** |
| **navigation.filter.ts** | Aplica decisões de acesso (canView/canEnter) e status (installed/enabled), remove grupos vazios |
| **navigation.breadcrumbs.ts** | Resolve breadcrumbs para URL (suporta /tools/<toolKey> e subpaths) |
| **navigation.active.ts** | Resolve item ativo no menu baseado na URL atual (matching exato/prefixo/toolKey) |
| **navigation.util.ts** | Funções auxiliares: normalização de URL, geração de IDs estáveis, matching, ordenação |
| **navigation.spec.ts** | Testes: build+filter, determinismo, context change rebuild, breadcrumbs, active item |

---

## 🔧 Como Funciona

### Fluxo de Construção da Navegação

```
1. ToolRegistry.listTools()          → Lista de ToolManifestLite
2. NavigationBuilder                 → Árvore base (Shell + Tools)
3. AccessDecisionService.canView()   → Filtra visibilidade
4. ToolRegistry.status()             → Aplica status (enabled/installed)
5. NavigationFilter                  → Árvore filtrada
6. NavigationService.menu$           → Stream reativa exposta
```

### Fluxo de Breadcrumbs

```
1. Router.events (NavigationEnd)     → URL atual
2. extractToolKeyFromUrl()           → Extrai toolKey (se /tools/<key>)
3. ToolRegistry.getTool(toolKey)     → Metadados da tool
4. resolveBreadcrumbs()              → Array de Breadcrumb
5. NavigationService.breadcrumbs$    → Stream reativa exposta
```

### Fluxo de Active Item

```
1. Router.events (NavigationEnd)     → URL atual
2. findNavItemByUrl()                → Match exato por URL
3. findNavItemByToolKey()            → Match por toolKey (fallback)
4. findNavItemByPrefix()             → Match por prefixo (subpaths)
5. NavigationService.activeItem$     → Stream reativa exposta
```

---

## 🚀 Uso Básico

### 1. Importar e Injetar

```typescript
import { NavigationService, NavTree, Breadcrumb } from '@hub-saap/access-layer';

@Component({...})
export class AppShellComponent implements OnInit {
  constructor(private navService: NavigationService) {}
}
```

### 2. Consumir Menu (Sidebar)

```typescript
menuGroups: NavGroup[] = [];

ngOnInit() {
  this.navService.menu$.subscribe((menu: NavTree) => {
    this.menuGroups = menu.groups;
  });
}
```

**Template:**

```html
<nav class="sidebar">
  <div *ngFor="let group of menuGroups" class="nav-group">
    <h3 class="group-label">{{ group.label }}</h3>
    <a *ngFor="let item of group.items"
       [routerLink]="item.url"
       [class.disabled]="item.disabled"
       [class.active]="item.id === activeItemId"
       [title]="item.disabledReason">
      <i *ngIf="item.icon" [class]="'icon-' + item.icon"></i>
      {{ item.label }}
      <span *ngIf="item.badge" class="badge">{{ item.badge.label }}</span>
    </a>
  </div>
</nav>
```

### 3. Consumir Breadcrumbs (Topbar)

```typescript
breadcrumbs: Breadcrumb[] = [];

ngOnInit() {
  this.navService.breadcrumbs$.subscribe((breadcrumbs) => {
    this.breadcrumbs = breadcrumbs;
  });
}
```

**Template:**

```html
<nav aria-label="breadcrumb">
  <ol class="breadcrumb">
    <li *ngFor="let crumb of breadcrumbs; let last = last"
        [class.active]="crumb.isActive || last">
      <a *ngIf="!crumb.isActive && crumb.url" [routerLink]="crumb.url">
        <i *ngIf="crumb.icon" [class]="'icon-' + crumb.icon"></i>
        {{ crumb.label }}
      </a>
      <span *ngIf="crumb.isActive || !crumb.url">{{ crumb.label }}</span>
    </li>
  </ol>
</nav>
```

### 4. Highlight Item Ativo

```typescript
activeItemId: string | null = null;

ngOnInit() {
  this.navService.activeItem$.subscribe((item) => {
    this.activeItemId = item?.id ?? null;
  });
}
```

### 5. Deep Links e Resolução Manual

```typescript
// Resolver navegação para URL específica
const result = this.navService.resolveNavForUrl('/tools/financeiro/invoices');

if (result.item) {
  console.log('Item:', result.item.label);
  console.log('Breadcrumbs:', result.breadcrumbs.map(b => b.label).join(' > '));
} else {
  console.warn('URL não encontrada no menu');
}
```

### 6. Snapshot Síncrono

```typescript
// Para render inicial sem aguardar stream
const snapshot = this.navService.snapshot();

this.menuGroups = snapshot.menu.groups;
this.breadcrumbs = snapshot.breadcrumbs;
this.activeItemId = snapshot.activeItem?.id ?? null;
```

### 7. Forçar Rebuild

```typescript
// Após mudança manual de contexto ou invalidação
this.contextService.changeContext('tenant-123');
this.navService.rebuild();
```

---

## 📋 Modelo de Dados

### NavTree

```typescript
interface NavTree {
  groups: NavGroup[];      // Grupos de navegação
  version: number;         // Versão para cache busting
  meta?: {                 // Metadados da árvore
    totalItems?: number;
    contextId?: string;
    generatedAt?: number;
  };
}
```

### NavGroup

```typescript
interface NavGroup {
  id: string;              // ID estável do grupo
  label?: string;          // Label do grupo (opcional)
  items: NavItem[];        // Itens dentro do grupo
  order?: number;          // Ordem de exibição
  collapsed?: boolean;     // Se está recolhido (UI)
  icon?: string;           // Ícone do grupo
}
```

### NavItem

```typescript
interface NavItem {
  id: string;              // ID estável (gerado por generateNavItemId)
  label: string;           // Label para exibição
  type: NavItemType;       // 'link' | 'group' | 'separator' | 'external'
  url?: string;            // URL absoluta ou relativa
  routeKey?: string;       // Route key para matching preciso
  toolKey?: string;        // Tool key (quando for item de tool)
  icon?: string;           // Ícone (nome do design system)
  order?: number;          // Ordem de exibição
  badge?: {                // Badge opcional
    label: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  };
  disabled?: boolean;      // Se está desabilitado
  disabledReason?: string; // Motivo da desabilitação
  meta?: Record<string, unknown>; // Metadados extras
}
```

### Breadcrumb

```typescript
interface Breadcrumb {
  label: string;           // Label para exibição
  url?: string;            // URL para navegação (se clicável)
  isActive?: boolean;      // Se é o último item (página atual)
  icon?: string;           // Ícone opcional
  toolKey?: string;        // Tool key (quando for breadcrumb de tool)
}
```

---

## 🔄 Reatividade e Rebuild

### Triggers de Rebuild Automático

O NavigationService reconstrói o menu automaticamente quando:

1. **Session change** - `SessionService.session$` emite
   - Ex: Login/logout, refresh de token, mudança de roles
   
2. **Context change** - `ContextService.contextChange$` emite
   - Ex: Troca de tenant/cliente/projeto
   
3. **Rebuild manual** - `navService.rebuild()` é chamado
   - Ex: Invalidação manual, debug, bootstrap forçado

### Debounce e Performance

O NavigationService aplica `debounceTime(50)` nas triggers para evitar thrashing:

```typescript
const triggers$ = merge(
  this.rebuildTrigger$,
  this.sessionService?.session$ ?? [],
  this.contextService?.contextChange$ ?? []
).pipe(debounceTime(50)); // Evita rebuild múltiplos em curto intervalo
```

### Determinismo

**Garantia:** Mesma entrada → Mesma árvore de navegação

```typescript
// Testado em navigation.spec.ts:
it('deve produzir o mesmo menu para a mesma entrada (determinismo)', ...);
```

Isto significa:
- IDs estáveis gerados por `generateNavItemId()`
- Ordenação previsível (campo `order`)
- Sem side effects ou estado externo não controlado

---

## 🧪 Testes

### Cobertura dos Testes

O arquivo `navigation.spec.ts` contém **54 testes** cobrindo:

1. **Build + Filter (Determinismo)**
   - Construção de menu com tools do registry
   - Determinismo (mesma entrada → mesma árvore)
   - Filtragem por AccessDecision (itens negados não aparecem)

2. **Context Change Rebuild**
   - Rebuild automático quando contexto muda
   - Versão do menu aumenta após rebuild

3. **Breadcrumbs para /tools/<toolKey>**
   - Breadcrumbs corretos para tool root (`/tools/financeiro`)
   - Breadcrumbs corretos para subpath (`/tools/financeiro/invoices`)
   - Breadcrumbs mínimos para toolKey desconhecido

4. **Active Item para /tools/<toolKey>**
   - Resolve activeItem correto para tool root
   - Resolve activeItem correto para subpath
   - Retorna null para toolKey desconhecido

5. **Snapshot**
   - Retorna snapshot síncrono do estado atual

6. **resolveNavForUrl**
   - Resolve navegação para URL específica

### Executar Testes

```bash
# Rodar todos os testes do access-layer
nx test access-layer

# Rodar testes em watch mode
nx test access-layer --watch

# Rodar testes com coverage
nx test access-layer --coverage

# Rodar apenas navigation.spec.ts
nx test access-layer --testFile=navigation.spec.ts
```

### Mocks do Angular

O NavigationService depende do Angular (`@angular/core`, `@angular/router`), mas os testes rodam em ambiente Node.js sem TestBed.

**Solução:** Mocks customizados em `libs/access-layer/src/__mocks__/@angular/`

Configuração no `jest.config.ts`:

```typescript
moduleNameMapper: {
  '^@angular/core$': '<rootDir>/src/__mocks__/@angular/core.ts',
  '^@angular/router$': '<rootDir>/src/__mocks__/@angular/router.ts',
}
```

Estes mocks fornecem:
- `Injectable`, `Inject`, `Optional`, `InjectionToken` (decorators e tokens)
- `Router` (events observable)
- `NavigationEnd` (classe de evento)

---

## 🔌 Integrações

### Com ToolRegistry

```typescript
interface IToolRegistryForNav {
  listTools(): ToolManifestLite[]; // Lista todas as tools cadastradas
}

interface IToolRegistryForFilter {
  status(toolKey: string): ToolStatus; // Status (installed/enabled)
}

interface IToolRegistryForBreadcrumbs {
  getTool(toolKey: string): ToolManifestLite | null; // Busca metadados
}
```

### Com AccessDecisionService

```typescript
interface IAccessDecisionServiceForNav {
  canView(target: DecisionTarget): boolean;  // Pode visualizar no menu?
  canEnter(target: DecisionTarget): boolean; // Pode navegar para rota?
}
```

### Com ContextService

```typescript
interface IContextServiceForNav {
  getActiveContext(): unknown;              // Contexto ativo atual
  contextChange$: Observable<unknown>;      // Stream de mudanças
}
```

### Com SessionService

```typescript
interface ISessionServiceForNav {
  isAuthenticated(): boolean;               // Se está autenticado
  session$?: Observable<unknown>;           // Stream de mudanças
}
```

### Com Angular Router

```typescript
// Observa eventos de navegação
this.router.events
  .pipe(filter(event => event instanceof NavigationEnd))
  .subscribe((event) => {
    this.currentUrl$.next(event.urlAfterRedirects || event.url);
  });
```

---

## 🐛 Troubleshooting

### Menu aparece vazio

**Causa:** ToolRegistry não está retornando tools.

**Solução:**
```typescript
console.log('Tools:', toolRegistry.listTools());
// Se retornar [], verificar se tools foram registradas no ToolRegistry
```

### Item não aparece no menu mas a rota funciona

**Causa:** AccessDecision está negando `canView()` para o item.

**Solução:**
```typescript
const decision = accessDecision.evaluate({ type: 'tool', key: 'financeiro' });
console.log('Decision:', decision.allowed, decision.denyReason);
// Verificar permissões, roles, feature flags
```

### Breadcrumbs mostram "Tool desconhecida"

**Causa:** `ToolRegistry.getTool(toolKey)` retorna `null`.

**Solução:**
```typescript
const tool = toolRegistry.getTool('financeiro');
if (!tool) {
  console.error('Tool não encontrada no registry:', 'financeiro');
  // Certificar que a tool foi registrada com toolKey correto
}
```

### Active item não atualiza

**Causa:** Router.events não está emitindo NavigationEnd.

**Solução:**
```typescript
this.router.events.subscribe((event) => {
  console.log('Router event:', event.constructor.name);
});
// Se não aparecer NavigationEnd, verificar se Router está configurado
```

### Menu não reconstrói após context change

**Causa:** NavigationService não foi configurado com ContextService.

**Solução:**
```typescript
navService.configure({
  contextService: myContextService,
});
// Ou usar navService.rebuild() manualmente
```

---

## 📐 Arquitetura e Design

### Princípios de Design

1. **Separation of Concerns**
   - Builder: constrói árvore base (não conhece permissões)
   - Filter: aplica regras de acesso (não conhece Router)
   - Service: orquestra tudo (não contém lógica de negócio)

2. **Dependency Inversion**
   - NavigationService depende de interfaces (`IToolRegistryForNav`, `IAccessDecisionServiceForNav`)
   - Não depende de implementações concretas
   - Facilita testes e mocking

3. **Reactive Streams**
   - Tudo é exposto como Observable
   - UI se inscreve nos streams e reage automaticamente
   - Sem polling ou refresh manual

4. **Determinism**
   - Mesmo input → Mesmo output (testado)
   - IDs estáveis (baseados em toolKey/routeKey/url)
   - Ordenação previsível

### Fluxo de Dados

```
ToolRegistry ──┐
               ├──> NavigationBuilder ──> NavTree (base)
               │                            │
Shell Config ──┘                            │
                                            ▼
AccessDecision ─┐                     NavigationFilter
                ├──> ToolStatus ─────────> │
ToolRegistry ───┘                           │
                                            ▼
                                       NavTree (filtered)
                                            │
                                            ▼
                                   NavigationService.menu$
                                            │
                                            ▼
                                      AppShell (UI)
```

### Por que não usar RouteGuards para construir menu?

**Problema:** RouteGuards são executados na navegação (ação do usuário). Se construirmos menu a partir deles, teríamos que:
- Simular navegação para cada rota → lento e imprevisível
- Duplicar lógica de decisão em menu e guard → drift

**Solução:** NavigationService consome **a mesma fonte** (AccessDecisionService) que RouteGuards usam. Isto garante:
- Menu e rotas sempre em sincronia
- Performance (decisão calculada uma vez)
- Testabilidade (decisão isolada e mockável)

---

## 🚧 Limitações Conhecidas

1. **Menu hierárquico profundo não suportado**
   - Estrutura atual: grupos → itens (2 níveis)
   - Para menu hierárquico (3+ níveis), seria necessário `NavItem.children`
   - Workaround: usar grupos para simular hierarquia

2. **Breadcrumbs para rotas dinâmicas limitados**
   - Suporta `/tools/<toolKey>` e subpaths estáticos
   - Rotas com parâmetros dinâmicos (`/tools/financeiro/invoice/:id`) geram breadcrumbs genéricos
   - Workaround: tool pode fornecer metadados adicionais via ActivatedRoute.data

3. **Rebuild pode gerar flicker visual**
   - Ao reconstruir, menu pode "piscar" se UI não usar `trackBy` ou `async` pipe corretamente
   - Workaround: usar `trackBy: trackByNavItemId` no `*ngFor`

4. **Sem suporte a menu contextual (right-click)**
   - NavigationService só fornece estrutura de menu principal
   - Menu contextual deve ser implementado pelo componente de UI

5. **Sem cache persistente**
   - Menu é reconstruído em memória a cada bootstrap
   - Não há cache em localStorage/sessionStorage
   - Workaround: implementar cache no AppShell se necessário

---

## 📚 Referências

- **Spec:** `Spec/navigation-service.spec.json`
- **Tests:** `libs/access-layer/src/lib/navigation/navigation.spec.ts`
- **Tool Contract:** `libs/tool-contract/` (ToolManifest, ToolMeta)
- **Access Decision:** `libs/access-decision/` (AccessDecisionService)
- **Blueprints:** `.github/instructions/` (access-layer-contracts, bootstrap-flow, boundaries)

---

## ✅ Checklist de Implementação

- [x] Models definidos (NavTree/NavGroup/NavItem/Breadcrumb)
- [x] Builder implementado (Shell + Tools)
- [x] Filter implementado (AccessDecision + status)
- [x] Resolvers implementados (breadcrumbs + active item)
- [x] Service orquestrador implementado
- [x] Integração com Router (NavigationEnd)
- [x] Integração com Context/Session (rebuild)
- [x] Testes mínimos (54 testes passando)
- [x] Mocks do Angular para testes sem TestBed
- [x] Exports públicos no index.ts
- [x] Documentação técnica completa

---

**Última atualização:** Março 2026  
**Versão:** 1.0.0  
**Status:** ✅ IMPLEMENTAÇÃO COMPLETA E TESTADA (54 testes passando)
