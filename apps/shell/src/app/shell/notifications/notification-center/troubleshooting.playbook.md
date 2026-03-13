# Playbook de Troubleshooting - NotificationCenterComponent

## 1. Resumo do componente

Playbook operacional para diagnóstico rápido quando notificações não chegam, ações falham ou links de destino não funcionam no `NotificationCenterComponent`.

---

## 2. Responsabilidades

### Faz
- Guiar investigação por sintomas.
- Mapear causas comuns observadas na implementação atual.
- Indicar ações de correção de baixo risco.

### Não faz
- Não substitui testes de regressão.
- Não define mudanças de contrato sem alinhamento com spec.

---

## 3. Inputs e Outputs

### Inputs para diagnóstico
- Logs do `ObservabilityServiceMock`.
- Resultado de testes unitários do componente.
- Estado do `NotificationService` (retorno de `getNotifications`, `markAsRead`, `clearAll`).
- Eventos de troca de contexto (`contextChange$`).

### Outputs esperados do diagnóstico
- Causa raiz provável.
- Ação corretiva imediata.
- Evidência de validação pós-correção.

---

## 4. Como usar

### Fluxo rápido de triagem
1. Confirmar se o painel está renderizado no `RightPanel`.
2. Rodar teste focado do componente:
   - `npx jest apps/shell/src/app/shell/notifications/notification-center/notification-center.component.spec.ts --config apps/shell/jest.config.ts --runInBand`
3. Verificar logs de eventos:
   - `notification_center_open`
   - `notification_center_load_error`
   - `notification_click`
4. Validar payload de notificação (id, título/corpo, severidade, data, link).
5. Repetir ação e confirmar telemetria pós-fix.

---

## 5. Critérios de validação

- Painel abre e mostra loading/empty/error/lista de forma consistente.
- Notificação nova aparece após recarga/context change.
- `markAsRead` e `markAllAsRead` atualizam estado de leitura.
- `clearAll` remove itens visíveis do painel.
- Click em item com `link` navega para rota válida.
- Testes focados do componente passam (`22/22`).

---

## 6. Troubleshooting (causas comuns)

### Sintoma: notificações não chegam
- Causa provável: `getNotifications()` retornando array vazio ou erro.
- Verificação: observar `notification_center_load_error` e estado `errorMessage`.
- Ação: validar implementação do serviço de origem e formato do payload.

### Sintoma: botão Marcar todas não faz nada
- Causa provável 1: todas as notificações já estão com `readAt` preenchido.
- Verificação: inspecionar `notifications().filter(!readAt)`.
- Ação: comportamento é idempotente; sem correção necessária.

- Causa provável 2: data source não implementa `markAllAsReadBatch`.
- Verificação: evento `notification_mark_read_all_batch_unavailable` e feedback operacional no painel.
- Ação: implementar `markAllAsReadBatch(notificationIds)` no provider de notificações.

### Sintoma: limpar funciona só na UI
- Causa provável: falha no método `clearAll` do serviço de notificações.
- Verificação: evento `notification_clear_error` e estado de erro no painel.
- Ação: corrigir implementação do serviço e revalidar contrato.

### Sintoma: clique abre rota errada ou 404
- Causa provável: `link` inválido no payload.
- Verificação: validar rota no `app.routes.ts`/rotas lazy de tools.
- Ação: corrigir link na origem e manter apenas caminhos internos do Hub.

### Sintoma: testes Nx falham mas teste do componente passa
- Causa provável: falha em suíte não relacionada executada no mesmo target.
- Verificação: executar Jest focado por arquivo.
- Ação: corrigir suíte externa separadamente; não bloquear validação local do componente.
