# FeatureFlags — Documentação Completa

**Versão**: 1.0  
**Status**: ✅ Approved  
**Última atualização**: 2026-02-11

---

## 📑 Índice

1. [Resumo do componente](#1-resumo-do-componente)
2. [Responsabilidades](#2-responsabilidades)
3. [Inputs e Outputs](#3-inputs-e-outputs)
4. [Como usar](#4-como-usar)
5. [Guia de naming e namespace](#5-guia-de-naming-e-namespace)
6. [Critérios de Validação](#6-critérios-de-validação)
7. [Troubleshooting](#7-troubleshooting)
8. [Governance e limites](#8-governance-e-limites)
9. [Exemplos práticos](#9-exemplos-práticos)
10. [API Reference](#10-api-reference)
11. [Troubleshooting Playbook (Advanced)](#11-troubleshooting-playbook-advanced)
12. [Debug tools](#12-debug-tools)

---

## 🚀 Quick start (5 min)

### 1. Bootstrap

```typescript
// app.component.ts
constructor(private flags: FeatureFlagsService) {}

ngOnInit() {
  this.flags.loadDefaults({
    version: 1,
    flags: [
      { key: 'global.dashboard', defaultValue: true },
      { key: 'global.beta', defaultValue: false },
    ],
  });
}
```

### 2. Use it

```typescript
// Síncrono
if (this.flags.isEnabled('global.dashboard')) { ... }

// Reativo
this.flags.watch('global.beta').subscribe(enabled => { ... })
```

### 3. Context changes

```typescript
this.flags.setContextSync({ tenant: 'acme', environment: 'staging' });
```

---

## ❓ FAQ rápido

**P: Qual a diferença entre `isEnabled()` e `watch()`?**  
R: `isEnabled()` retorna boolean agora (síncrono); `watch()` emite mudanças (reativo).

**P: Flags e permissões são a mesma coisa?**  
R: **NÃO**. Flags controlam feature availability; permissões controlam acesso. Use access-decision para permissões.

**P: Como rollout gradual?**  
R: Combine defaults + rules. Veja § 5. Guia de naming.

**P: Limite de flags?**  
R: Sim, 50 overrides na memória. Para governança, revise naming conventions.

**P: Precisa de HTTP?**  
R: Não é obrigatório. Defaults são locais; sync remoto é opcional.

---

## 1. Resumo do componente

**FeatureFlags** é um asset frontend que centraliza a avaliação e distribuição de feature flags no Hub SaaP.

### Responsabilidade central
Ser a **fonte única de verdade** para habilitar/desabilitar features e tools, resolvendo o estado efetivo por contexto (tenant, ambiente, etc.) sem replicar lógica em múltiplos lugares.

### Características principais
- ✅ Flags com namespace (global e por toolKey) — sem colisões
- ✅ Merge determinístico: defaults → overrides → context rules
- ✅ API reativa (RxJS) — subscribers notificados em mudanças
- ✅ Validação early-fail — rejeita config inválida no bootstrap
- ✅ Sem HTTP obrigatório — usa defaults locais por padrão

---

## 2. Responsabilidades

| Responsabilidade | Implementado | Detalhe |
|---|---|---|
| Fonte única de habilitação | ✅ | Singleton `providedIn: 'root'` |
| Resolver flags determinísticas | ✅ | Merge order determinística, version tracking |
| Namespace por tool | ✅ | Format: `global.feature` \| `toolKey.feature` |
| API reativa | ✅ | `isEnabled()`, `watch()`, `watchState()`, `snapshot()` |
| Context invalidation | ✅ | Recalcula em mudança de contexto (debounce 150ms) |
| Validação rigorosa | ✅ | FlagKey, FlagSet, rules, overrides |

### O que NÃO faz (Responsabilidades negadas)

❌ **Não substitui autorização** — flag ≠ permissão (acesso é gerenciado por access-decision)  
❌ **Não é policy engine (ABAC)** — rules simples (máx 10 conditions, 4 operators)  
❌ **Não faz HTTP obrigatório** — defaults são locais; sync remoto é opcional  
❌ **Não implementa UI** — sem toggle admin/debug (seria outra lib)  
❌ **Não quebra app sem config** — lookupFlag retorna `{ enabled: false }` para keys desconhecidas  

---

## 3. Inputs e Outputs

### Inputs

| Input | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| **Runtime Config** | `FlagSet` | ✅ | `{ version: 1, flags: [{key: 'global.dashboard', defaultValue: true}] }` |
| **Overrides** | `FlagOverrideSet` | ⭕ (opcional) | `{ 'global.beta': {key: 'global.beta', value: true, ttl: 3600000} }` |
| **Rules** | `FlagRule[]` | ⭕ (opcional) | `[{flagKey: 'global.beta', conditions: [{field: 'environment', operator: 'eq', value: 'staging'}], result: true}]` |
| **Context** | `FlagContext` | ⭕ (opcional) | `{ tenant: 'acme', environment: 'staging', attributes: {customField: 'value'} }` |

### Outputs

| Output | Tipo | Descrição |
|---|---|---|
| **Effective Flags** | `FlagMap` | `Record<FlagKey, FlagState>` com estado resolvido |
| **Flag State** | `FlagState` | `{ enabled, reason, version }` |
| **Snapshot** | `FlagSnapshot` | Estado freezado (flags + context + version + timestamp) |
| **Observables** | RxJS | Streams reativas para subscribers |

---

## 4. Como usar

### 4.1 Configuração inicial (Bootstrap)

```typescript
import { FeatureFlagsService } from '@hubsaap/feature-flags';

// No AppComponent ou bootstrap
constructor(private flags: FeatureFlagsService) {}

ngOnInit() {
  // 1. Carregar defaults do runtime config
  this.flags.loadDefaults({
    version: 1,
    flags: [
      { key: 'global.dashboard', defaultValue: true, description: 'Dashboard visível?' },
      { key: 'global.beta', defaultValue: false },
      { key: 'toolA.export', defaultValue: true },
    ],
  });

  // 2. (Opcional) Carregar rules simples
  this.flags.loadRules([
    {
      flagKey: 'global.beta',
      conditions: [
        { field: 'environment', operator: 'eq', value: 'staging' },
        { field: 'tenant', operator: 'in', value: ['acme', 'globex'] },
      ],
      result: true, // habilita em staging para acme/globex
    },
  ]);
}
```

### 4.2 Verificação síncrona

```typescript
// Verificar se feature está habilitada (síncrono)
if (this.flags.isEnabled('global.dashboard' as FlagKey)) {
  // Dashboard disponível
}
```

### 4.3 Observação reativa

```typescript
// Observable de mudanças
this.flags.watch('global.beta' as FlagKey).subscribe((enabled) => {
  console.log('Beta habilitado:', enabled);
});

// Com reason (auditoria)
this.flags.watchState('global.beta' as FlagKey).subscribe((state) => {
  console.log(`Flag: ${state.enabled}, Razão: ${state.reason}, Version: ${state.version}`);
});

// Todas as flags
this.flags.watchAll().subscribe((allFlags) => {
  console.log('Snapshots:', allFlags);
});
```

### 4.4 Context change (invalidação)

```typescript
// Ao trocar tenant/ambiente, recalcular flags
onContextChange(newContext: FlagContext) {
  // Com debounce (padrão 150ms)
  this.flags.updateContext(newContext);

  // Ou síncrono (urgente)
  this.flags.setContextSync(newContext);
}
```

### 4.5 Uso em RouteGuard

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureGate implements CanActivate {
  constructor(private flags: FeatureFlagsService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const featureKey = route.data['featureKey'] as FlagKey;
    return this.flags.isEnabled(featureKey);
  }
}

// Em routing
{
  path: 'beta-feature',
  component: BetaComponent,
  canActivate: [FeatureGate],
  data: { featureKey: 'global.beta' }
}
```

### 4.6 Overrides (admin/debug)

```typescript
// Forçar um estado (persistindo com TTL)
this.flags.setOverrides({
  'global.beta' as FlagKey: {
    key: 'global.beta',
    value: true,
    ttl: 3600000, // 1 hora
    createdAt: Date.now(),
  },
});
```

---

## 5. Guia de naming e namespace

### Formato obrigatório

```
namespace.featureName

Exemplos válidos:
  ✅ global.dashboard          ← global feature
  ✅ global.newUX              ← global experimental
  ✅ toolA.export              ← tool specific
  ✅ toolA.advancedExport      ← feature avançada de tool
  ✅ nav.sidebarV2             ← versão nova

Inválidos:
  ❌ newFeature                ← falta namespace
  ❌ global.feature.v2         ← múltiplos dots
  ❌ GLOBAL.DASHBOARD          ← uppercase
  ❌ global_dashboard          ← underscore no lugar de dot
```

### Naming conventions

#### Namespaces globais

```typescript
global.*
  global.dashboard        // Feature central do Hub
  global.beta            // Beta mode / experimental
  global.darkMode        // UI preference
  global.advancedFilters // Advanced features
```

Use `global.` para:
- Features que afetam múltiplas tools
- Configurações do Hub central
- Rollouts que impactam toda plataforma

#### Namespaces por tool

```typescript
toolA.*
  toolA.export          // Feature de export
  toolA.realtimeSync    // Sincronização real-time
  toolA.advancedSearch  // Busca avançada
```

Use `toolKey.` para:
- Features específicas da tool
- Testes A/B isolados
- Rollouts graduais por tool

#### Nomes descritivos

```
✅ BOM                           ❌ RUIM
export                           exp
realtimeSync                     rtSync
advancedSearch                   advSearch
betaUI                           b_ui
darkModeEnabled                  dm
```

**Regras:**
- camelCase (não snake_case)
- Use nomes significativos (evite siglas)
- Máx 30 chars (legível em logs)

---

### Tipos de flags

#### Feature flags (padrão)

```typescript
// Nova feature em rollout
{ key: 'global.newDashboard', defaultValue: false }

// Behavior:
// - Default: OFF
// - On demand: pode ser ativada via rule ou override
```

#### Beta / Experimental

```typescript
{ key: 'global.beta', defaultValue: false }

// Behavior:
// - Default: OFF
// - Staging: ON via rule
// - Production: OFF (ou pequeno % via rule)
```

#### A/B Tests

```typescript
{ key: 'toolA.uiVariantB', defaultValue: false }

// Behavior:
// - ON para usuarios selecionados (rule com tenant/client)
// - OFF para resto
```

#### Gradual rollout

```typescript
{ key: 'global.v2Api', defaultValue: true }  // 0% → 100%

// Phase 1: Default false, règle 10%
// Phase 2: Default true, règle 90% (off)
// Phase 3: Remove feature flag
```

---

### Documentação de flags

Ao definir flags, sempre documente:

```typescript
const flags: FlagDefinition[] = [
  {
    key: 'global.newDashboard',
    defaultValue: false,
    description: 'Ativa novo dashboard unificado. Rollout: 0% (staging) → 100% (Q2 2026)',
  },
  {
    key: 'toolA.advancedExport',
    defaultValue: false,
    description: 'Exportação com filtros avançados. Só para toolA. Beta em acme tenant.',
  },
];
```

#### Template de descrição

```
[Breve descrição da feature]
Rollout: [percentual/fase]
Escopo: [global/toolX/tenantY]
Alvo de remoção: [data ou N/A]
Owner: [time]
```

---

### Versionamento de breaking changes

```typescript
// Se alterar comportamento, use novo nome
✅ BOM:
  { key: 'global.dashboard', defaultValue: true }      // v1 (legacy)
  { key: 'global.dashboardV2', defaultValue: false }   // v2 (new)

❌ RUIM:
  // Não alterar diretamente; quebra consumers
  { key: 'global.dashboard', defaultValue: false }  // ⚠️ Breaking!
```

#### Retirement

```typescript
// Remover flags após 3+ meses de rollout completo
// 1. Deixar feature flag ON por padrão
// 2. Remover condition de rules
// 3. Documentar remoção
// 4. Após 1 mês: deletar código do serviço
// 5. Após 3 meses: remover da config
```

---

### Checklist para PR

```
[ ] Flag segue formato namespace.featureName
[ ] Descrição adicionada explicando propósito e rollout
[ ] Rules testadas (se houver context-based logic)
[ ] Validação de versão incrementada (version++)
[ ] Sem hardcode de valores em componentes
[ ] Teste cobrindo merge order (defaults → overrides → rules)
```

---

## 6. Critérios de Validação

### Validação automática (early-fail)

A operação falha silenciosamente (logs de erro) se:

| Critério | Validação | Comportamento |
|---|---|---|
| **FlagKey inválida** | Regex: `^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$` | Rejeitado em `loadDefaults`, `setOverrides` |
| **Keys duplicadas** | Detecção no array | Rejeitado em `loadDefaults` |
| **Conditions excessivas** | MAX: 10 por rule | Rejeitado em `loadRules` |
| **Overrides excessivos** | MAX: 50 chaves | Rejeitado em `setOverrides` |
| **Version negativa** | `>= 0` | Rejeitado em `loadDefaults` |

---

## 7. Troubleshooting

### Problema: Flag sempre retorna `false`

**Causas comuns:**
1. **Config não carregou** — `loadDefaults()` não chamado ou falhou
   - **Solução**: Verifique logs, valide `FlagSet`

2. **Typo na chave** — `isEnabled('global.dashbord')` vs config `global.dashboard`
   - **Solução**: Use constantes ou enums para FlagKeys

3. **Key não existe em defaults** — novo feature adicionado dinamicamente
   - **Solução**: `lookupFlag` retorna `{ enabled: false }` como padrão seguro

### Problema: Flag não reage a context change

**Causas comuns:**
1. **Sem regras** — rules não carregadas com `loadRules()`
   - **Solução**: Verifique se regras foram registradas

2. **Debounce mascarando mudança** — mudança rápida + debounce 150ms
   - **Solução**: Use `setContextSync()` para urgência ou aguarde ~200ms

3. **Condição não bate contexto** — rule espera `environment === 'staging'` mas contexto é `'production'`
   - **Solução**: Valide regra contra contexto fornecido

### Problema: "Máximo de 50 overrides excedido"

**Causas comuns:**
1. **Admin mode acumulando** — múltiplas alterações sem limpar
   - **Solução**: `setOverrides({})` para limpar ou revisar governança de debug

2. **Sem TTL em overrides** — persistem indefinidamente
   - **Solução**: Sempre defina `ttl` em overrides temporários

### Problema: Watch subscriber não emite

**Causas comuns:**
1. **`distinctUntilChanged` bloqueando** — valor não mudou
   - **Solução**: Alterar versão ou valor da flag (recalculate)

2. **Observable completado** — componente foi destruído
   - **Solução**: Verifique `ngOnDestroy` e unsubscribe

### Problema: "isValidFlagKey rejected 'a.b.c'"

**Causa:** TypeScript aceita múltiplos dots em compile-time, mas runtime rejeita
   - **Solução**: Use apenas UM dot: `namespace.feature`

---

## 8. Governance e limites

```typescript
// Limites configurados em FLAG_LIMITS
const FLAG_LIMITS = {
  MAX_OVERRIDES: 50,              // Máx 50 overrides por contexto
  MAX_CONDITIONS_PER_RULE: 10,    // Máx 10 conditions por rule
  DEBOUNCE_MS: 150,               // Debounce em context change
} as const;
```

**Recomendações:**
- ✅ Revisar explosão de flags em PR (nomear com padrão)
- ✅ Documentar flags globais vs per-tool
- ✅ Usar `reason` codes para auditoria (`default`, `override`, `contextRule`)
- ✅ Testar version tracking em merge order

---

## 9. Exemplos práticos

### Exemplo 1: Feature flag simples (global)

```typescript
// Config
const config: FlagSet = {
  version: 1,
  flags: [
    { key: 'global.newDashboard', defaultValue: false }
  ]
};

service.loadDefaults(config);

// Uso
*ngIf="flags.isEnabled('global.newDashboard')"
  <new-dashboard></new-dashboard>
*ngIf="!(flags.isEnabled('global.newDashboard'))"
  <legacy-dashboard></legacy-dashboard>
```

### Exemplo 2: Staging rollout (com rule)

```typescript
// Rule: ativar beta em staging
service.loadRules([
  {
    flagKey: 'global.beta',
    conditions: [
      { field: 'environment', operator: 'eq', value: 'staging' }
    ],
    result: true
  }
]);

// Em staging: enabled = true
// Em production: enabled = false (default)
```

### Exemplo 3: Per-tool feature

```typescript
// Config
flags: [
  { key: 'toolA.advancedExport', defaultValue: false },
  { key: 'toolB.realtimeSync', defaultValue: true }
]

// Recuperar apenas flags de toolA
const toolAFlags = service.flagsForTool('toolA');
// { 'toolA.advancedExport': FlagState, ... }
```

---

## 10. API Reference (Quick)

| Método | Assinatura | Retorno | Uso |
|---|---|---|---|
| `loadDefaults()` | `(flagSet: FlagSet) => void` | — | Bootstrap |
| `loadRules()` | `(rules: FlagRule[]) => void` | — | Configurar rules |
| `setOverrides()` | `(overrides: FlagOverrideSet) => void` | — | Admin/debug |
| `isEnabled()` | `(key: FlagKey) => boolean` | boolean | Síncrono |
| `watch()` | `(key: FlagKey) => Observable<boolean>` | Observable | Reativo |
| `watchState()` | `(key: FlagKey) => Observable<FlagState>` | Observable | Com reason |
| `watchAll()` | `() => Observable<Readonly<FlagMap>>` | Observable | Todas flags |
| `snapshot()` | `() => FlagSnapshot` | FlagSnapshot | Estado congelado |
| `flagsForTool()` | `(toolKey: string) => FlagMap` | FlagMap | Por namespace |
| `updateContext()` | `(ctx: FlagContext) => void` | — | Context change (debounced) |
| `setContextSync()` | `(ctx: FlagContext) => void` | — | Context change (síncrono) |

---

## 11. Troubleshooting Playbook (Advanced)

### Diagnóstico rápido

| Sintoma | Causa provável | Verificação |
|---|---|---|
| "Invalid config" no console | FlagSet malformado | Valide chaves e types |
| Flag sempre false | Não carregou defaults | Revise bootstrap order |
| Watch não emite | distinctUntilChanged bloqueando | Altere valor/version |
| Contexto não recalcula | Sem rules | `loadRules()` foi chamado? |

---

### Scenario 1: Flag não muda após context change

#### Sintomas
```
setContextSync({ tenant: 'acme' })
this.flags.isEnabled('global.beta') // Still false!
```

#### Diagnóstico
1. **Há rules registradas?**
   ```typescript
   // ❌ Se não:
   this.flags.loadRules([
     {
       flagKey: 'global.beta',
       conditions: [{ field: 'tenant', operator: 'eq', value: 'acme' }],
       result: true,
     },
   ]);
   ```

2. **Rule bate o contexto?**
   ```typescript
   // Debug: Verificar conditions
   const rule = rules[0];
   console.log('Regra:', rule);
   console.log('Contexto:', context);
   console.log('Field value:', context[rule.conditions[0].field]);
   ```

3. **Version está incrementando?**
   ```typescript
   const snap1 = this.flags.snapshot();
   this.flags.setContextSync({ tenant: 'acme' });
   const snap2 = this.flags.snapshot();
   console.log(snap1.version, '→', snap2.version); // Deve +1
   ```

#### Solução
- Verifique regra vs contexto
- Valide field names (case-sensitive)
- Use `setContextSync()` para evitar debounce

---

### Scenario 2: TypeScript vs Runtime mismatch

#### Sintoma
```typescript
const key = 'a.b.c' as FlagKey;  // ✅ TypeScript OK
this.flags.isEnabled(key);       // ❌ Runtime: rejected
```

#### Causa
FlagKey type aceita múltiplos dots, mas validator rejeita.

#### Solução
```typescript
// ✅ Válido
type GlobalFlag = 'global.dashboard' | 'global.beta';
const key: FlagKey = 'global.dashboard';

// ❌ Inválido
const key: FlagKey = 'a.b.c';  // Rejeita validador
```

---

### Scenario 3: Override não persiste

#### Sintoma
```typescript
this.flags.setOverrides({ 'global.beta': { ... } });
// Minutos depois...
this.flags.isEnabled('global.beta') // false novamente
```

#### Causa
Override com TTL expirou.

#### Solução
```typescript
// ✅ Persistência indefinida
setOverrides({
  'global.beta': {
    key: 'global.beta',
    value: true,
    // sem TTL ou ttl: 0
  },
});

// ⚠️ Expira após 1 hora
setOverrides({
  'global.beta': {
    key: 'global.beta',
    value: true,
    ttl: 3600000,
    createdAt: Date.now(),
  },
});
```

---

### Scenario 4: "Máximo de 50 overrides excedido"

#### Sintoma
```
[FeatureFlags] Overrides inválidos: Máximo de 50 overrides
```

#### Causa
Muitos flags em modo admin/debug.

#### Solução
```typescript
// 1. Limpar tudo
this.flags.setOverrides({});

// 2. Ou manter apenas necessários
this.flags.setOverrides({
  'global.beta': { key: 'global.beta', value: true, ttl: 3600000 },
  // ... máx 50 total
});

// 3. Sempre use TTL em overrides
```

---

### Scenario 5: Flags misturando (bad merge order)

#### Sintoma
Config global = false, override = true, rule = false  
Esperado: `true` (rule > override > default)  
Obtido: `false`

#### Causa
Merge order incorreta ou rule não aplicada.

#### Verificação
```typescript
const snap = this.flags.snapshot();
const state = snap.flags['global.beta'];
console.log('Enabled:', state.enabled);
console.log('Reason:', state.reason);  // 'default' | 'override' | 'contextRule'
console.log('Version:', state.version);

// Esperado:
// Enabled: false (rule = false)
// Reason: contextRule
```

---

### Scenario 6: Memory leak com subscribers

#### Sintoma
```
[NProgress] WARNING: You are watching this object 
but haven't unsubscribed
```

#### Causa
Subscriber não sendo desfeito ao destruir componente.

#### Solução
```typescript
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.flags.watch('global.beta')
      .pipe(takeUntil(this.destroy$))  // ✅ Sempre adicione!
      .subscribe((enabled) => {
        // ...
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 12. Debug tools

### 1. Inspect snapshot

```typescript
// Console
flags.snapshot() // FlagSnapshot completo

// Output
{
  flags: {
    'global.beta': { enabled: false, reason: 'default', version: 2 },
    'toolA.export': { enabled: true, reason: 'override', version: 2 }
  },
  context: { tenant: 'acme', environment: 'staging' },
  version: 2,
  timestamp: 1702345678000
}
```

### 2. Watch all changes

```typescript
flags.watchAll().subscribe((allFlags) => {
  console.table(allFlags);
});
```

### 3. Validate config

```typescript
import { validateFlagSet, validateRules } from '@hubsaap/feature-flags';

const result = validateFlagSet(config);
if (!result.valid) {
  result.errors.forEach(err => console.error(err));
}
```

---

### Checklist de debugging

- [ ] Config carregou? (`loadDefaults()` OK)
- [ ] Rules registradas? (`loadRules()` OK)
- [ ] FlagKey válida? (regex: `^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$`)
- [ ] Version incrementa? (após recalculate)
- [ ] Context bate regra? (field/value corretos)
- [ ] Override com TTL? (se for temporário)
- [ ] Subscriber desfeito? (`takeUntil(destroy$)`)
- [ ] Merge order OK? (reason = contextRule > override > default)

---

## 📞 Contato e próximos passos

- **Dúvidas?** Consulte a ficha técnica ou abra issue
- **Sugestões?** PR com melhorias em validação, rules ou auditoria
- **Integração?** Conecte com error-model (quando disponível) e observability-service

**Recomendado próximo:**
- 🔜 Integrar error-model para falhas normalizadas
- 🔜 Emitir eventos observability (flags.loaded, flags.contextChanged)
- 🔜 Deep freeze em snapshot (proteção extra)
