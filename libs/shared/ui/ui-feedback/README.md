# UiFeedback (Shared UI)

Biblioteca de componentes de feedback de UX para estados previsíveis em Shell e Tools.

## Objetivo

Padronizar estados `loading`, `empty`, `error`, `denied` e `success` com API reutilizável, acessível e sem acoplamento de domínio.

## Contratos e limites

- Não implementa autorização/policies (`PolicyEngine`, `PermissionService`).
- Não executa HTTP nem retry real (somente expõe ações/CTAs).
- Não contém lógica de domínio de Tool.
- Consome mensagens prontas do consumidor e suporta `ErrorModel -> UiMessage` via mapper.

## i18n e textos

A lib não fixa traduções de domínio. O consumidor deve sempre injetar textos já traduzidos (ex.: via `i18n-core`) em:

- `UiLoaderComponent.label` (obrigatório)
- `UiMessage.title`
- `UiMessage.message`
- `FeedbackAction.label`

Exemplo:

```html
<ui-loader [label]="t('common.loading')"></ui-loader>
```

## Exemplo de uso no Shell

```html
<ui-error-state
  [message]="bootstrapErrorMessage"
  [actions]="[{ label: t('common.retry'), handlerKey: 'retry-bootstrap' }]"
  [showCorrelation]="true"
  [autoFocus]="true"
  (actionClick)="onBootstrapErrorAction($event)"
></ui-error-state>
```

## Exemplo de uso em Tool

```html
<ui-empty-state
  [message]="{ title: t('orders.empty.title'), message: t('orders.empty.message') }"
  [actions]="[
    { label: t('orders.empty.refresh'), handlerKey: 'refresh' },
    { label: t('orders.empty.help'), handlerKey: 'open-help' }
  ]"
  (actionClick)="onEmptyAction($event)"
></ui-empty-state>
```

## Erros e segurança

Use `mapErrorToMessage` para redigir conteúdo técnico/sensível e exibir fallback seguro:

```ts
const uiMessage = mapErrorToMessage(errorModel);
```

`UiErrorStateComponent` permite controlar explicitamente a exibição de correlação:

- `showCorrelation = false` (padrão)
- `showCorrelation = true` para suporte/observabilidade

Para `UiDeniedState`, o consumidor deve fornecer mensagem não técnica e sem PII/segredos.

## Acessibilidade

- `ui-loader`: `role="status"`, `aria-live="polite"`
- `ui-empty-state`: `role="region"`, `aria-labelledby` do título
- `ui-error-state` e `ui-denied-state`: `role="alert"`, `aria-live="assertive"`
- `ui-banner`: `role="status"`, `aria-live="polite"`

Uso recomendado de `ui-banner`:

- Banner inline persistente no contexto da tela/seção.
- Toasts de curta duração podem reutilizar o mesmo padrão semântico (`status`/`aria-live`) em camada de notificação da plataforma.

## Performance

`UiSkeleton` é leve, mas em listas grandes o consumidor deve usar paginação ou virtualização (`cdk-virtual-scroll`) para evitar custo de renderização excessivo.
