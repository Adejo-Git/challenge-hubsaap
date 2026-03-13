# ErrorModel

Resumo
-----
ErrorModel é uma biblioteca pequena e sem IO que fornece um contrato padrão para representar erros no frontend. Normaliza falhas de autenticação, autorização, flags, HTTP e validação em um `StandardError` com códigos previsíveis, severidade, mensagem amigável para UI, `correlationId` e detalhes sanitizados para logs e decisões.

Responsabilidades
-----------------
- Fornecer enums e tipos: `ErrorCategory`, `ErrorCode`, `Severity`, `DenyReason` e `StandardError`.
- Mapear fontes variadas (HttpErrorResponse, denyReason, exceptions) para `StandardError` via mappers.
- Sanitizar detalhes para evitar vazamento de tokens/PII e truncar payloads grandes.
- Gerar ou preservar `correlationId` para correlação entre camadas.

Inputs e Outputs
-----------------
- Inputs:
  - Erros brutos de HttpClient (`status`, `error`, `message`, `url`).
  - `DenyReason` vindo de guards/AccessDecision.
  - Exceptions nativas ou objetos de erro.
  - Opcional: `correlationId` gerado por infra/observability.
- Outputs:
  - `StandardError` com campos: `category`, `code`, `severity`, `userMessage`, `technicalMessage?`, `correlationId?`, `detailsSafe?`, `timestamp`, `source?`.

Como usar
---------
1) Normalizar um `HttpErrorResponse` (ex.: em um interceptor):

```ts
import { fromHttpError } from '@hub-saap/error-model';

const standard = fromHttpError({ status: 401, message: 'Unauthorized', url: '/api/foo' });
// usar standard.code / standard.userMessage / standard.correlationId
```

2) Normalizar um `DenyReason` em guards:

```ts
import { fromDenyReason } from '@hub-saap/error-model';

const err = fromDenyReason('unauthenticated');
// envia para notificationService ou redirect para login
```

3) Normalizar exceptions genéricas:

```ts
import { fromException } from '@hub-saap/error-model';

try { /* ... */ } catch (e) {
  const std = fromException(e);
  // log/telemetry / toast
}
```

Sanitização e garantias de segurança
-----------------------------------
- Remove/mascara campos sensíveis: headers `Authorization`, chaves `token`, `password`, `credential`.
- Substitui padrões PII: emails, CPF, CNPJ por tokens `[REDACTED_*]`.
- Remove tokens presentes em query params (`access_token=`).
- Trunca payloads maiores que ~1KB para evitar vazamento de dados e uso excessivo de memória.
- Não realiza IO nem telemetria — é uma camada puramente in-memory e determinística.

Casos de uso recomendados
------------------------
- `http-base` / interceptors: normalizar respostas de erro antes de propagar.
- Guards / AccessDecision: transformar `denyReason` em `StandardError` para UX consistente.
- Observability-service: receber `StandardError` (já sanitizado) para log/telemetria.

Exemplos rápidos
---------------
- `ErrorCode` mais comuns:
  - `AUTH_EXPIRED`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `NOT_FOUND`, `FLAG_DISABLED`, `HTTP_TIMEOUT`, `HTTP_NETWORK_ERROR`, `HTTP_SERVER_ERROR`, `VALIDATION_ERROR`, `UNKNOWN_ERROR`.

Playbook de troubleshooting por `ErrorCode`
-----------------------------------------
- `UNAUTHENTICATED` / `AUTH_EXPIRED`: redirecionar para login; verificar tokens/refresh.
- `PERMISSION_DENIED`: checar mapeamento de permissões/roles e decision logic.
- `NOT_FOUND`: confirmar endpoint/ID; não é retentável.
- `HTTP_TIMEOUT` / `HTTP_NETWORK_ERROR`: checar conectividade; retentar conforme política.
- `HTTP_SERVER_ERROR`: verificar backend; reportar com `correlationId`.

Notas de integração
------------------
- A lib não depende de `observability-service` — ela produz `StandardError` que é consumido por observability.
- Mensagens de `buildUserMessage` são fornecidas em pt-BR como fallback; integrar `i18n-core` se disponível.
