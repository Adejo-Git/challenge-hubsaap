# PatternsSmartTable

Pattern reutilizável de tabela smart para Shell/Tools com paginação, ordenação, filtros, seleção, colunas dinâmicas, estados padrão e integração por DataProvider.

## Objetivo

- Padronizar UX de tabelas (`loading`, `empty`, `error` + `retry`).
- Manter estado de query serializável (`page`, `pageSize`, `sort`, `filters`).
- Suportar providers local/remoto sem `HttpClient` direto.
- Emitir eventos determinísticos para integração externa.

## Exemplo rápido (provider local)

```ts
import { SmartTableLocalDataProvider } from './providers/local.provider';

const provider = new SmartTableLocalDataProvider([
  { id: '1', name: 'Registro A', status: 'ok' },
  { id: '2', name: 'Registro B', status: 'pending' },
]);
```

```html
<hub-smart-table
  [columns]="columns"
  [dataProvider]="provider"
  rowKey="id"
  selectionMode="multi"
  [actions]="actions"
  preferencesKey="tool-x:auditoria"
></hub-smart-table>
```

## Exemplo remoto (sem HTTP direto no pattern)

```ts
import { SmartTableRemoteDataProvider } from './providers/remote.provider';

const provider = new SmartTableRemoteDataProvider((queryState) => {
  return fetchFnNoDataAccess(queryState);
});
```

`fetchFnNoDataAccess` deve vir da camada de data-access/SDK da tool.

## API principal

### Inputs
- `columns`
- `dataProvider`
- `rowKey`
- `initialState`
- `selectionMode` / `selectionOptions`
- `actions`
- `layoutOptions`
- `preferencesKey`

### Outputs
- `stateChange`
- `selectionChange`
- `rowAction`
- `bulkAction`
- `error`

## Preferências

Quando `preferencesKey` for informado, o pattern persiste preferências com namespace:

- `visibleColumns`
- `density`
- `pageSize`

Formato de chave: `hubsaap:smart-table:<preferencesKey>`.

## Limites e anti-patterns

Este pattern **não**:

- faz chamadas HTTP;
- conhece DTO de domínio;
- aplica decisão de permissão;
- define política de paginação do backend;
- substitui um grid framework completo.

## Quando usar provider local vs remoto

- **Local**: datasets pequenos e estáveis em memória.
- **Remoto**: datasets médios/grandes e paginação orientada por backend.

## Checklist de integração com Access Decision

- Filtre `actions.row` e `actions.bulk` **antes** de passar para o pattern, usando saídas da Access Layer (`AccessDecisionService` / capabilities).
- Não avalie permissões no `SmartTableComponent`.
- Em caso de negação de acesso a operações em lote, envie `actions.bulk` já vazio/filtrado.
- Evite condição de permissão no template consumidor; concentre a decisão na camada de decisão de acesso.
