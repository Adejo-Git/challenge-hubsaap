# PatternsApprovalWidget

Pattern reutilizável para fluxo de decisão de aprovação com ações padronizadas (`approve`, `reject`, `requestChanges`).

## Objetivo

- Exibir status atual da entidade (`pending`, `approved`, `rejected`, `changesRequested`, `blocked`)
- Renderizar ações somente conforme `availableActions`
- Capturar comentário/motivo com validação local configurável
- Aplicar confirmação opcional por ação
- Emitir eventos padronizados para o consumidor executar integração real

## Uso básico

```html
<hub-approval-widget
  [subject]="subject"
  [status]="status"
  [availableActions]="availableActions"
  [busy]="busy"
  [uiOptions]="uiOptions"
  [history]="history"
  (approve)="onApprove($event)"
  (reject)="onReject($event)"
  (requestChanges)="onRequestChanges($event)"
  (cancel)="onCancel()"
  (validationError)="onValidationError($event)"
></hub-approval-widget>
```

## Inputs

- `subject`: referência da entidade alvo (id, type, title opcional)
- `status`: estado atual
- `availableActions`: ações habilitadas calculadas externamente
- `policyHints`: mensagens opcionais de policy
- `history`: histórico opcional de decisões
- `busy`: bloqueia controles para execução externa
- `uiOptions`: regras de comentário obrigatório, labels e confirmação por ação

## Outputs

- `approve`: payload padronizado com `subject`, `action`, `comment?`, `metadata?`
- `reject`: payload padronizado
- `requestChanges`: payload padronizado
- `cancel`: cancelamento sem decisão
- `validationError`: erro local de validação (ex.: comentário obrigatório)

## Integração com Access Decision

`availableActions` deve ser calculado fora do widget (ex.: `AccessDecisionService`).
O pattern não calcula permissão e não contém regra de autorização.

## Anti-patterns

- Fazer chamada HTTP direto no widget
- Aplicar decisão de permissão dentro do componente
- Acoplar payload a regras de domínio específicas
- Persistir histórico/comentário local fora do ciclo de interação
