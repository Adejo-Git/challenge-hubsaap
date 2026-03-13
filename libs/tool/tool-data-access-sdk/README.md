# Tool Data Access SDK

SDK padronizado de acesso a dados para Tools.

## Responsabilidades

- Encapsular acesso a dados em clients tipados (nunca HttpClient direto em componentes)
- Padronizar tratamento de erro (HTTP → ToolDataError) com correlação
- Padronizar headers/context enrichment via interceptors
- Permitir evolução por tool mantendo padrões comuns

## Uso

```typescript
import { WorkspaceClient } from '@hub/tool-data-access-sdk';

// Injetar client no serviço da tool
constructor(private workspaceClient: WorkspaceClient) {}

// Chamar métodos tipados
this.workspaceClient.getWorkspace(workspaceId).subscribe({
  next: (workspace) => console.log(workspace),
  error: (err: ToolDataError) => console.error(err.message, err.correlationId)
});
```

## Estrutura

- `clients/` - Clients tipados por recurso
- `models/` - DTOs e contratos versionáveis
- `errors/` - Normalização de erros (ToolDataError)
- `interceptors/` - Interceptors opcionais

## Telemetria e CorrelationId

O SDK emite eventos de telemetria (`http.request.success` e `http.request.error`) via `ObservabilityService` quando disponível. Esses eventos incluem metadados como método, path, latência e **correlationId** (quando presente nos headers de resposta HTTP).

⚠️ **Importante**: O `correlationId` é incluído nos eventos de telemetria e pode ser correlacionado em logs. Certifique-se de que este identificador não contém dados sensíveis. Se necessário, desabilite a emissão de telemetria através da configuração do `ObservabilityService`.

## Testes

Usar `HttpTestingController` para mockar chamadas HTTP.

### Configuração Jest (ESM Workaround)

⚠️ **Nota técnica**: O `jest.config.ts` contém overrides de `transform` e `transformIgnorePatterns` necessários para testes funcionarem com Angular ESM packages (fesm2022). Sem esses overrides, `setupZoneTestEnv` falha ao importar `@angular/core.mjs`. Esta é uma limitação conhecida do Jest + Angular + ESM que requer ajustes locais até que o preset raiz seja atualizado para suportar ESM de forma mais robusta.
