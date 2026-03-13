# FeatureFlagService

**Camada:** Access Layer — `libs/access-layer/src/lib/flags/`
**Versão:** 1.0 | **Status:** ✅ Aprovado

---

## 1. Resumo do componente

`FeatureFlagService` é o **ponto único de consumo de feature flags** do Hub SaaP para Shell e Tools.

Ele encapsula a shared-lib `feature-flags` por meio de um adapter (`FeatureFlagsAdapter`), normaliza o namespace de chaves (`namespace.featureName`) e recalcula flags automaticamente ao trocar de contexto (via `ContextService`).

> **Regra central:** flag ≠ permissão. Flags controlam *disponibilidade* de feature (gating). Decisão de acesso é responsabilidade do `AccessDecisionService`.

---

## 2. Responsabilidades

**O serviço FAZ:**
- Ser a API oficial de flags para o Hub (Shell + Tools)
- Encapsular a shared-lib `feature-flags` — proibir imports diretos nas apps
- Aplicar e validar namespace (`global.x` e `toolKey.featureKey`)
- Recalcular flags ao trocar contexto (dispara `setContextSync` no adapter)
- Expor API mínima e estável: `isEnabled` / `watch` / `snapshot` / `tool()`

**O serviço NÃO FAZ:**
- Resolver flags (isso é a shared-lib `feature-flags`)
- Substituir autorização (flags ≠ permissões — use `AccessDecisionService`)
- Expor internals da engine (rules, overrides, merge strategy)
- Fazer chamadas HTTP

---

## 3. Inputs e Outputs

### Inputs (dependências do construtor)

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `adapter` | `FeatureFlagsAdapter` | ✅ | Bridge para a shared-lib `feature-flags`. Implementar e prover via DI. |
| `contextInvalidation$` | `Observable<void>` | ⬜ opcional | Stream que emite quando o contexto muda. Vem de `ContextService.contextInvalidation$()`. |
| `contextSnapshotFn` | `() => Record<string, unknown> \| null` | ⬜ opcional | Função que retorna o contexto atual. Vem de `() => ctx.snapshot()`. |

### Interface `FeatureFlagsAdapter` (contrato do adapter)

```typescript
interface FeatureFlagsAdapter {
  isEnabled(key: FlagKey): boolean;
  watch(key: FlagKey): Observable<boolean>;
  snapshot(): FlagSnapshotLite;
  setContextSync(ctx: Record<string, unknown>): void;
  explain?(key: FlagKey): FlagExplanation | null;  // opcional
}

interface FlagExplanation {
  key: FlagKey;
  enabled: boolean;
  source: 'default' | 'override' | 'rule' | 'unknown';
  reason?: string;
  metadata?: Record<string, unknown>;
}
```

### Outputs (API pública)

| Método | Retorno | Descrição |
|---|---|---|
| `isEnabled(key)` | `boolean` | Estado atual da flag (síncrono). Lança `FlagValidationError` para key inválida. |
| `watch(key)` | `Observable<boolean>` | Emite `true`/`false` toda vez que a flag muda. Lança `FlagValidationError` para key inválida. |
| `snapshot()` | `FlagSnapshotLite` | Deep copy seguro do mapa de flags efetivas. Mutar o retorno não afeta o estado interno. |
| `tool(toolKey)` | `{ isEnabled, watch, explain }` | Helper de ergonomia para flags de tool. Monta `toolKey.featureKey` automaticamente. |
| `explain(key)` | `FlagExplanation \| null` | Retorna informações sobre a origem/razão da flag (opcional, depende do adapter). Útil para troubleshooting. |
| `destroy()` | `void` | Cancela subscriptions internas. Chamar em `ngOnDestroy`. |

### Tipos de retorno

```typescript
// Snapshot seguro — sem rules/overrides/merge internos
interface FlagSnapshotLite {
  flags: Readonly<Record<FlagKey, { enabled: boolean }>>;
  version: number;
  timestamp: number;
}
```

### `FlagValidationError` (erros padronizados)

```typescript
class FlagValidationError extends Error {
  code: 'MissingFlagKey' | 'InvalidNamespace'; // código semântico
  category: ErrorCategory.FLAGS;               // error-model
  errorCode: ErrorCode.VALIDATION_ERROR;       // error-model
  severity: Severity.WARNING;                  // error-model
}
```

---

## 4. Como usar

### 4.1 Registrar no módulo Angular

`FeatureFlagService` é uma **plain class** (sem `@Injectable`). Use o provider factory recomendado:

```typescript
import { provideFeatureFlagService, FEATURE_FLAGS_ADAPTER_TOKEN } from '@hub/access-layer/flags';
import { ContextService } from '@hub/access-layer/context';

// Opção 1: Uso com ContextService (recomendado para Shell e Tools)
providers: [
  { provide: FEATURE_FLAGS_ADAPTER_TOKEN, useClass: MyFeatureFlagsAdapter },
  provideFeatureFlagService({
    contextInvalidation$: inject(ContextService).contextChange$,
    contextSnapshotFn: () => inject(ContextService).snapshot()
  })
]

// Opção 2: Uso standalone (testes ou apps sem contexto)
providers: [
  { provide: FEATURE_FLAGS_ADAPTER_TOKEN, useClass: MockFeatureFlagsAdapter },
  provideFeatureFlagServiceStandalone()
]

// Opção 3: Factory manual (legado)
providers: [
  {
    provide: FeatureFlagService,
    useFactory: (adapter: FeatureFlagsAdapter, ctx: ContextService) =>
      new FeatureFlagService(
        adapter,
        ctx.contextInvalidation$(),
        () => ctx.snapshot()
      ),
    deps: [FEATURE_FLAGS_ADAPTER_TOKEN, ContextService]
  }
]
```

### 4.2 Verificação síncrona (isEnabled)

```typescript
// Flag global
if (this.flags.isEnabled('global.dashboard')) {
  // exibir painel
}

// Flag de tool — helper ergonômico
if (this.flags.tool('toolA').isEnabled('export')) {
  // exibir botão de exportação
}
```

### 4.3 Observação reativa (watch)

```typescript
// Em um componente Angular
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Flag global
    this.flags.watch('global.beta')
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => {
        this.betaVisible = enabled;
      });

    // Flag de tool
    this.flags.tool('toolA').watch('export')
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => {
        this.exportVisible = enabled;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.flags.destroy(); // liberar subscriptions internas
  }
}
```

### 4.4 Snapshot

```typescript
const snap = this.flags.snapshot();

// Verificar todas as flags ativas
for (const [key, state] of Object.entries(snap.flags)) {
  console.log(key, state.enabled);
}

// Seguro: mutar o retorno não afeta o estado interno
snap.flags['global.dashboard'].enabled = false; // não afeta nada
```

### 4.5 Troubleshooting com explain() (opcional)

```typescript
// Obter informações sobre a origem da flag
const explanation = this.flags.explain('global.dashboard');
if (explanation) {
  console.log(`Flag: ${explanation.key}`);
  console.log(`Enabled: ${explanation.enabled}`);
  console.log(`Source: ${explanation.source}`);  // 'default' | 'override' | 'rule'
  console.log(`Reason: ${explanation.reason}`);
}

// Para tool flags
const toolExplanation = this.flags.tool('toolA').explain('export');
if (toolExplanation) {
  console.log(toolExplanation.metadata);
}

// Retorna null se o adapter não suporta explain
const result = this.flags.explain('some.flag');
if (result === null) {
  console.log('Adapter does not support explain()');
}
```

### 4.6 Gating em RouteGuard (via AccessDecision — modo correto)

```typescript
// ❌ ERRADO: flag usada diretamente como permissão
canActivate() {
  return this.flags.isEnabled('global.adminPanel');
}

// ✅ CORRETO: gating via AccessDecisionService
canActivate() {
  return this.decision.canEnter({ target: 'adminPanel', context }).allow;
}
```

### 4.7 Namespace obrigatório

```
Formato: namespace.featureName  (exatamente um ponto)

✅ global.dashboard    ← feature global
✅ global.beta         ← experimental / rollout
✅ toolA.export        ← feature de tool específica
✅ nav.sidebar-v2      ← componente de navegação

❌ nodot               ← sem namespace → MissingFlagKey / InvalidNamespace
❌ a.b.c               ← múltiplos pontos → InvalidNamespace
❌ toolA.feat.v2       ← múltiplos pontos → InvalidNamespace
⚠️ toolA:export       ← dois-pontos em vez de ponto → InvalidNamespace (use toolA.export)
```

### 4.8 Tratamento de erros de validação

```typescript
import { FlagValidationError } from 'libs/access-layer/src/lib/flags/feature-flag.namespace';

try {
  this.flags.isEnabled('chave-sem-ponto');
} catch (e) {
  if (e instanceof FlagValidationError) {
    // e.code       → 'MissingFlagKey' | 'InvalidNamespace'
    // e.category   → ErrorCategory.FLAGS  (error-model)
    // e.errorCode  → ErrorCode.VALIDATION_ERROR
    // e.severity   → Severity.WARNING
    console.warn('[Flags]', e.code, e.message);
  }
}
```

---

## 5. Critérios de validação

| Critério | Como verificar |
|---|---|
| Shell/Tools não importam `feature-flags` diretamente | `grep -r "from '.*feature-flags'"` não deve retornar imports em `apps/` |
| Namespace `namespace.featureName` aplicado | `isEnabled('chave-sem-ponto')` lança `FlagValidationError` |
| Troca de contexto recalcula flags | Após `ctx.setContext(...)`, `adapter.setContextSync` é chamado |
| Snapshot imutável | Mutar `snap.flags['k'].enabled` não altera resultado da próxima chamada |
| Sem HTTP direto | Nenhum import de `HttpClient` no serviço |
| Testes passando | `npx nx test access-layer --testFile=feature-flag.spec.ts` — 33 testes ✅ |

---

## 6. Troubleshooting

### Flag sempre retorna `false`

**Causa 1:** `FeatureFlagsAdapter` não foi implementado ou provido no módulo.
**Solução:** Verificar `providers` do módulo Angular. A factory deve fornecer um adapter concreto.

**Causa 2:** Flag não foi registrada na shared-lib (`loadDefaults` não chamado ou chave diferente).
**Solução:** Verificar se o adapter concreto chama `featureFlagsService.loadDefaults(...)` no bootstrap.

---

### `FlagValidationError` com `code: 'InvalidNamespace'`

**Causa:** Chave não segue o padrão `namespace.featureName` — sem ponto, múltiplos pontos ou formato incorreto.
**Solução:** Usar exatamente um ponto. Exemplos válidos: `global.beta`, `toolA.export`.

---

### `FlagValidationError` com `code: 'MissingFlagKey'`

**Causa:** Chave vazia ou `undefined` foi passada para `isEnabled` / `watch`.
**Solução:** Verificar se a constante de chave está corretamente definida antes de usar.

---

### Watch não emite após troca de contexto

**Causa:** `contextInvalidation$` não foi passado ao construtor, ou o adapter não propaga `setContextSync` para a engine de flags.
**Solução:** Confirmar que o factory provider passa `ctx.contextInvalidation$()` e que o adapter implementa `setContextSync` invocando `featureFlagsService.setContextSync(ctx)`.

---

### Memory leak — warnings de subscriber não removido

**Causa:** `destroy()` não foi chamado no `ngOnDestroy` do componente que assina `watch()`.
**Solução:** Chamar `this.flags.destroy()` no `ngOnDestroy`, ou usar `takeUntil(destroy$)` em todas as subscriptions.

---

### `tool('toolA').isEnabled('feat.v2')` lança erro

**Causa:** `featureKey` contém ponto — `feat.v2` — o que produziria `toolA.feat.v2` (chave inválida com dois pontos).
**Solução:** `featureKey` não pode conter pontos. Use `featV2` ou `feat-v2`.

---

## Estrutura de arquivos

```
libs/access-layer/src/lib/flags/
├── feature-flag.model.ts       Tipos: FlagKey, ToolKey, FeatureKey, FlagSnapshotLite
├── feature-flag.namespace.ts   buildToolFlagKey, validateFlagKey, FlagValidationError
├── feature-flag.adapters.ts    Interface FeatureFlagsAdapter + FlagExplanation (bridge para shared-lib)
├── feature-flag.service.ts     Facade: isEnabled / watch / snapshot / tool() / explain() / destroy()
├── feature-flag.providers.ts   Factories: provideFeatureFlagService + DI tokens
├── feature-flag.spec.ts        33 testes — namespace, watch, snapshot, context change, explain
├── index.ts                    Public API surface
└── README.md                   Este arquivo
```
