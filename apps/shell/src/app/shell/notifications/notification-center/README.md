# NotificationCenterComponent

## 1. Resumo do componente

O `NotificationCenterComponent` exibe notificações do Hub em formato de painel (lista + filtros + ações), com foco em UX consistente para leitura e navegação por deep link.

**Path:** `apps/shell/src/app/shell/notifications/notification-center/`
**Selector:** `hub-notification-center`
**Status atual:** implementado, integrado ao `RightPanel` do `AppShellComponent` e testado em unidade.

---

## 2. Responsabilidades

### Faz
- Renderizar lista de notificações com ordenação (não lidas primeiro).
- Exibir estados de UI: loading, empty e error.
- Permitir filtros por status (`all`/`unread`) e severidade.
- Executar ações de leitura (`markAsRead`, `markAllAsRead`) e limpeza (`clearAll`).
- Navegar para deep link da notificação.
- Registrar telemetria mínima (`open`, `close`, `click`, `mark-read`, `clear`).

### Não faz
- Não usa `HttpClient` direto no componente.
- Não avalia policy/permissão no template.
- Não mantém inbox persistente própria fora da fonte do serviço.
- Não implementa fluxo de autenticação/autorização.

---

## 3. Inputs e Outputs

### Inputs (dependências)
- `NotificationServiceMock` (fonte de dados e ações do inbox).
- `ContextServiceMock` (recarregar em troca de contexto).
- `NavigationServiceMock` + `Router` (deep link).
- `ObservabilityServiceMock` (telemetria e erro).

### Contrato de dados (push vs pull)
- Preferencial: `notifications$` (stream reativo) para atualização sem polling.
- Compatibilidade: `getNotifications()` permanece suportado.
- Quando `notifications$` não é fornecido, o componente faz refresh sob demanda no bootstrap e em `contextChange$` (sem polling interno).

### Estratégia para listas grandes
- Paginação incremental client-side por lotes de `50` itens.
- O painel renderiza os primeiros itens e libera `Carregar mais notificações` quando houver excedente.
- Para crescimento contínuo, manter evolução para virtualização no data-source/UI pattern compartilhado.

> Nota: no estado atual da aplicação, o componente está ligado a mocks do Shell.

### Outputs
- Lista renderizada com estado lida/não lida e severidade.
- Ações de usuário refletidas no estado local + chamadas do serviço.
- Navegação por link da notificação.
- Eventos de observabilidade para uso/ações.

---

## 4. Como usar

### 4.1 Importar componente standalone

```ts
import { NotificationCenterComponent } from './notifications/notification-center/notification-center.component';
```

### 4.2 Renderizar no RightPanel

```html
<aside class="right-panel">
  <hub-notification-center></hub-notification-center>
</aside>
```

### 4.3 Providers necessários (estado atual)
- `NotificationServiceMock`
- `ContextServiceMock`
- `NavigationServiceMock`
- `ObservabilityServiceMock`

---

## 5. Critérios de validação

- Renderiza loading, empty, error e lista.
- Mostra notificações ordenadas com não lidas primeiro.
- `markAsRead`, `markAllAsRead` e `clearAll` funcionam sem erro.
- Clica em item com link e navega para destino.
- Recarrega notificações após `contextChange$`.
- Não há `HttpClient` no componente.
- Subscriptions usam `takeUntilDestroyed`.
- Testes do componente passando (`22/22`).

---

## 6. Troubleshooting (causas comuns)

### Painel não aparece no Shell
**Causa:** Falha de import/provisionamento dos providers do NotificationCenter.
**Ação:** validar `NotificationCenterComponent` em `imports` do AppShell e providers de facade no `app.config.ts`.

### Ação de limpar não persiste no backend
**Causa:** Implementação de `clearAll` ausente ou com erro no serviço.
**Ação:** garantir contrato do serviço com `clearAll()` e validar erro/sucesso no painel.

### Testes via Nx falham mesmo com teste do componente verde
**Causa:** `nx test shell --testPathPattern` executa suites extras com falhas não relacionadas.
**Ação:** validar também com Jest focado no arquivo do componente.

### Consumo alto em marcação em massa
**Causa:** execução item-a-item em lotes grandes.
**Ação:** expor `markAllAsReadBatch(ids)` no data source para reduzir chamadas paralelas.

### Notificações não atualizam em tempo real
**Causa:** provider implementa apenas modo pull.
**Ação:** expor `notifications$` no data source para push contínuo e atualização imediata; manter `getNotifications()` apenas para carga inicial/refresh por contexto.
