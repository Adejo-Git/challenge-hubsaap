# Notifications Data Access

Resumo
-----
Serviço reativo compartilhado que centraliza notificações do Hub e de Tools em um feed único. Fornece streams imutáveis `notifications$` e `unreadCount$`, API de ações (`push`, `markRead`, `markAllRead`, `dismiss`, `clearAll`, `open`), dedupe configurável, política de retenção e persistência opcional via `LocalStorageAdapter`.

Responsabilidades
-----------------
- Expor feed reativo de notificações (`notifications$`) e contagem de não-lidas (`unreadCount$`).
- Normalizar e armazenar `NotificationItem` vindos de erros, ToolEvents e produtores internos.
- Aplicar dedupe por `dedupeKey` dentro de uma janela configurável.
- Aplicar política de retenção (limite máximo de itens, remoção FIFO com prioridade em itens arquivados).
- Oferecer persistência opcional via `StorageAdapter` com versionamento de schema (v1).
- Garantir sanitização mínima de payloads para evitar vazamento de PII/tokens.
- Permanecer desacoplado de UI e respeitar boundaries Nx.

Inputs e Outputs
-----------------
- Inputs:
	- `push(partial NotificationItem)` — publicar notificações a partir de Tools, interceptors ou código da app.
	- `mapErrorToNotification(StandardError)` — uso em interceptors/guards para transformar erros padronizados em notificações.
	- `mapToolEventToNotification(event)` — uso por integradores de ToolEvents.
	- Configuração no construtor: `{ maxItems?, dedupeWindowMs?, persistence? }`.
- Outputs:
	- `notifications$: Observable<NotificationItem[]>` — lista ordenada (recente primeiro).
	- `unreadCount$: Observable<number>` — derivado do feed.
	- Métodos públicos: `markRead(id)`, `markAllRead()`, `dismiss(id)`, `clearAll()`, `open(id)`.

Como usar
---------
Exemplo mínimo:

```ts
import { NotificationService } from '@hub-saap/notifications-data-access';

const svc = new NotificationService({ persistence: true, maxItems: 200 });
svc.notifications$.subscribe(list => /* render no NotificationCenter */ null);
svc.push({ title: 'Atualização', message: 'Nova versão disponível', dedupeKey: 'update:v1.2' });
```

Integração com ToolEvents / interceptors
---------------------------------------
- Ao receber um `ToolEvent`, mapear com `mapToolEventToNotification(event)` e `svc.push(...)`.
- Em interceptors, ao normalizar erro para `StandardError`, usar `mapErrorToNotification(error)` e publicar.

Dedup e retenção
-----------------
- `dedupeKey`: itens com mesma chave dentro de `dedupeWindowMs` (padrão 5min) atualizam o item existente.
- `maxItems`: limite padrão 100. Remoção FIFO com prioridade para itens `archive=true`.
- Configuração via construtor ou feature flags (integração de flags deve ser feita externamente e passada ao construtor).

Persistência
------------
- Ativar `persistence: true` no construtor usa `LocalStorageAdapter`.
- `LocalStorageAdapter` usa schema `v1` e protege contra gravações maiores que ~1MB; em caso de storage corrompido realiza fallback limpando chave.

Critérios de validação
----------------------
- `notifications$` e `unreadCount$` emitem estados consistentes sem side-effects indesejados.
- `push` gera `id` e `timestamp` quando ausentes.
- Dedupe atualiza em vez de duplicar dentro da janela configurada.
- Retenção respeita `maxItems` e remove itens arquivados antes de remover items recentes.
- Persistência salva/recupera estado quando habilitada e trata quota/corrupção graciosamente.
- Sanitização filtra Authorization, tokens em URLs, emails/CPF/CNPJ e trunca payloads grandes.

Troubleshooting (causas comuns)
------------------------------
- Notificações duplicadas: verifique `dedupeKey` e aumente `dedupeWindowMs` se necessário.
- `unreadCount` não atualiza: garantir subscribe correto e que o serviço é instanciado/injetado pelo provider compartilhado.
- Persistência corrompida: limpar storage e reabrir; considerar migration quando alterar schema.
- PII em notificações: revisar produtores e assegurar que mappers aplicam sanitização antes do `push`.
- Race conditions no dedupe: simular cargas concorrentes; considerar serialização de operações se ocorrerem conflitos.
- Dependência circular: NotificationService não deve importar Tool ou Shell; integrar via adapters injetáveis.

Observações de integração
------------------------
- A implementação atual referencia `StandardError` de `libs/error-model` por caminho relativo; para builds Nx mais limpos, adicionar path alias em `tsconfig.base.json` (ex.: `@hub-saap/error-model`) e ajustar imports.
- Integração com `FeatureFlags` e `ObservabilityService` deve ser feita via injeção de adaptadores em vez de imports diretos para evitar dependências circulares.
- Testes adicionais recomendados: concorrência/dedupe, persistência em ambientes com quota limitada e migrações de schema.

Arquivo no repo
---------------
`libs/notifications/data-access/README.md`

Próximos passos sugeridos
------------------------
1. Adicionar path mappings em `tsconfig.base.json` (opcional) para evitar imports relativos longos.
2. Implementar adapters para `ToolEvents` e `ObservabilityService` e injetá-los no `NotificationService`.
3. Expandir testes para cobertura e casos de race condition conforme spec.

