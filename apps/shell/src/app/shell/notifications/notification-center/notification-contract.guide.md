# Guia de Contrato de Notificação

## 1. Resumo do componente

Este guia define o contrato mínimo de payload de notificação consumido pelo `NotificationCenterComponent` e como o deep link é tratado.

---

## 2. Responsabilidades

### Faz
- Documentar campos mínimos para interoperabilidade.
- Explicar normalização de payloads heterogêneos.
- Definir comportamento esperado para links e leitura.

### Não faz
- Não define transporte (HTTP, websocket, polling).
- Não define autorização de acesso ao destino do link.

---

## 3. Inputs e Outputs

### Input esperado (contrato normalizado)

```ts
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  link?: string | null;
  createdAt: Date;
  readAt?: Date | null;
}
```

### Input flexível aceito no feed (pré-normalização)

```ts
export interface NotificationFeedItem {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  severity?: NotificationSeverity;
  type?: NotificationSeverity;
  link?: string | null;
  createdAt?: Date | string;
  timestamp?: Date | string;
  readAt?: Date | string | null;
  read?: boolean;
}
```

### Capacidades opcionais do DataSource

```ts
export interface NotificationCenterDataSource {
  readonly notifications$?: Observable<NotificationFeedItem[]>;
  getNotifications(): Observable<NotificationFeedItem[]>;
  markAsRead(notificationId: string): Observable<void>;
  markAllAsReadBatch?(notificationIds: string[]): Observable<void>;
  clearAll(): Observable<void>;
}
```

- `notifications$` habilita atualização push sem polling interno no componente.
- `markAllAsReadBatch` é o caminho recomendado para marcação em massa e evita fan-out de requests no UI.

### Regras de normalização implementadas
- `title` padrão: `Notificação`.
- `body` usa `body` ou fallback para `message`.
- `severity` usa `severity` ou fallback para `type`.
- Data usa `createdAt` ou `timestamp`; valor inválido cai para fallback seguro (`now`).
- Estado de leitura usa `readAt` ou `read`; `readAt` inválido usa fallback de `createdAt`.

### Recomendação de formato de data
- Preferir ISO-8601 UTC (`2026-02-24T10:00:00.000Z`) para evitar inconsistências de fuso horário.

### Output funcional
- Lista pronta para renderização e ordenação.
- Deep link acionável para navegação no Hub.
- Erros operacionais expostos em `UiFeedback` sem interromper fluxo do painel.

---

## 4. Como usar

### Exemplo de payload mínimo válido

```json
{
  "id": "notif-123",
  "title": "Deploy concluído",
  "body": "Ferramenta Example Tool atualizada.",
  "severity": "success",
  "link": "/tools/tax-map",
  "createdAt": "2026-02-24T10:00:00.000Z",
  "readAt": null
}
```

### Exemplo alternativo aceito (com `message` e `type`)

```json
{
  "id": "notif-124",
  "message": "Manutenção programada às 23h.",
  "type": "warning",
  "timestamp": "2026-02-24T18:00:00.000Z",
  "read": false
}
```

### Deep link
- Quando `link` existir, o componente navega via `NavigationService.navigateTo(link)`.
- Links devem ser rotas internas do Hub (`/tools/...`, `/dashboard`, etc.).

---

## 5. Critérios de validação

- Payload com campos mínimos renderiza sem erro.
- Payload alternativo é normalizado corretamente.
- Sem `id`, item deve ser tratado como inválido na origem do serviço.
- Link interno navega para rota alvo.
- Eventos de click e mark-read são registrados em telemetria.

---

## 6. Troubleshooting (causas comuns)

### Notificação sem título no painel
**Causa:** origem não envia `title`.
**Resultado atual:** componente usa fallback `Notificação`.

### Data inconsistente
**Causa:** origem envia string inválida em `createdAt`/`timestamp`.
**Ação:** validar e padronizar ISO-8601 no serviço produtor.

### Link quebrado
**Causa:** `link` aponta para rota inexistente.
**Ação:** revisar rota de destino e garantir padrão interno do Hub.
