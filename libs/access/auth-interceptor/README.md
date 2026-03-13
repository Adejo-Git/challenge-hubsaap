# Auth Interceptor (libs/auth-interceptor)

Nota: esta biblioteca consome a implementação concreta de observability via o pacote
`@hub/observability/data-access` (fornece `ObservabilityService`).

No repositório de especificações a dependência é referida genericamente como `observability-service`.
Para fins de wiring no workspace atual, use `@hub/observability/data-access` como provedor.

Motivo: manter compatibilidade com as specs que usam o nome de contrato lógico `observability-service`.
