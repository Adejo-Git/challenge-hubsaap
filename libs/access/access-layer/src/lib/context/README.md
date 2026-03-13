# ContextService (Access Layer)

Short guide and technical documentation for `ContextService` (source of truth for tenant/client/project/environment).

## Resumo do componente

`ContextService` é o ponto único do Access Layer que mantém o contexto ativo do Hub (`tenantId`, `clientId`, `projectId`, `environmentKey`). Expõe uma API reativa (`context$`) e operações imperativas (`setContext`, `clearContext`) com validação, persistência opcional e sinais mínimos de observability. Não contém PII e não faz chamadas HTTP diretas.

## Responsabilidades

- Ser a fonte única do contexto ativo no frontend.
- Validar formato mínimo do contexto e aplicar regras de allowlist (ambientes permitidos).
- Trocar contexto de forma reativa e consistente (emitir alterações, invalidar derivados).
- Persistir/restaurar `ContextLite` via um `ContextStorage` opcional (scoped + TTL).
- Emitir eventos mínimos de observability sem PII (`changed$`, payload: `{ key, source }`).

## Inputs e Outputs

**Inputs**
- `RuntimeConfig` (ex.: `requireTenant`, `allowedEnvironments`).
- `ContextStorage` (opcional): implementação async com `load()`, `save()`, `clear()` (ex.: `InMemoryContextStorage` para testes; em produção use `storage-secure`).

**Outputs / API pública**
- `context$(): Observable<ContextLite | null>` — stream reativa do contexto ativo.
- `snapshot(): ContextLite | null` — snapshot síncrono do contexto.
- `setContext(next: ContextLite, options?)` — valida e troca contexto; `options.persist` controla persistência.
- `clearContext(options?)` — limpa contexto e dispara invalidation.
- `changed$`: `Subject<{ key?: string; source?: string }>` — evento mínimo para observability e caches.
- `contextInvalidation$(): Observable<void>` — sinal explícito para invalidar caches (opcional).

## Como usar

1. Instanciar o serviço (ex.: no bootstrap do Shell):

```ts
import { ContextService, InMemoryContextStorage } from './context'

const storage = new InMemoryContextStorage({ ttlSeconds: 3600, scopeKey: 'user:123' })
const ctxSvc = new ContextService(null, { allowedEnvironments: ['dev','prod'] }, storage)

// restore no bootstrap
await ctxSvc.restoreFromStorage()
```

2. Consumir reativamente (padrão recomendado):

```ts
ctxSvc.context$()
	.pipe(switchMap(ctx => ctx ? loadFeatureFlagsFor(ctx) : of(defaultFlags)))
	.subscribe(flags => /* atualizar UI */)
```

3. Trocar contexto via UI (Topbar):

```ts
await ctxSvc.setContext({ tenantId: 't1', environmentKey: 'dev' }, { persist: true, source: 'user' })
```

4. Limpar contexto (ex.: logout ou fluxo obrigatório):

```ts
ctxSvc.clearContext({ source: 'user' })
```

### Observability

- Inscrever-se em `changed$` para telemetria mínima; payload contém somente `key` e `source` (sem PII). Prefira enviar o `key` ou apenas um boolean/hash para evitar vazamento de identificadores.

## Critérios de validação (automáticos)

- Testes unitários devem cobrir:
	- `setContext` atualiza `snapshot()` e emite via `context$()` (happy path).
	- `setContext` idempotente: mesma chave não re-emite.
	- `clearContext` limpa snapshot e emite `null`.
	- `restoreFromStorage` aplica contexto válido; expira e limpa dados expirados; corrompido → limpagem segura e null.
	- Validações lançam `ContextRequired`, `InvalidContext`, `ContextNotAllowed` conforme `RuntimeConfig`.
	- `changed$` emite payload sem PII e `restore` usa `source: 'restore'`.

## Troubleshooting (causas comuns)

- Problema: `restoreFromStorage` não restaura.
	- Causa: storage não configurado ou TTL expirado. Verifique `ContextStorage` e `scopeKey`.

- Problema: consumers não recomputam após troca de contexto.
	- Causa: consumidor não usa `context$()` reativo; pode estar lendo `snapshot()` apenas. Solução: usar `context$.pipe(switchMap(...))` e cachear por `buildContextKey(ctx)`.

- Problema: eventos de telemetria com dados sensíveis.
	- Causa: enviar `ContextLite` inteiro nos eventos. Solução: publicar apenas `key`/hash/booleans em `changed$`.

- Problema: validação falha inesperadamente.
	- Causa: `RuntimeConfig.requireTenant` está true e o contexto não tem `tenantId`. Verificar configuração de bootstrap/claims.

## Testing

- Unit tests live in `context.spec.ts` and cover: set/clear/idempotence, restore (valid/expired/corrupt), validation, events, and consumer recompute patterns.
- Run tests for the context spec:

```bash
npx jest libs/access-layer/src/lib/context/context.spec.ts --runInBand --config=jest.config.ts
```

## Integration notes

- On app bootstrap: call `restoreFromStorage()` (if storage enabled) and handle `null` when context is required (redirect to selector). Do not store PII.
- Consumers should prefer reactivity: `context$.pipe(switchMap(ctx => loadFor(ctx)))` and key caches by `buildContextKey(ctx)`.

