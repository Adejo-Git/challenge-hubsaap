# @shared/ui-components

Biblioteca de primitives e contratos de UI reutilizáveis para Shell e Tools.

## API pública

A API pública é exposta por `libs/shared/ui/ui-components/index.ts` com exports explícitos.

### Primitives

- Button
  - `variant`: `primary | secondary | danger | ghost`
  - `size`: `sm | md | lg`
  - `state`: `default | active | disabled | loading`
- IconButton
  - `variant`: `primary | secondary | danger | ghost`
  - `size`: `sm | md | lg`
  - `state`: `default | active | disabled | loading`
- Badge
  - `variant`: `default | success | warning | error | info`
  - `size`: `sm | md`
- Tag
  - `variant`: `default | primary | success | warning | danger`
  - `size`: `sm | md`
  - `state`: `default | active | disabled`
- Alert
  - `variant`: `info | success | warning | error`
  - `size`: `sm | md`
  - `state`: `default | dismissible`
- Link
  - `variant`: `default | primary | danger | muted`
  - `size`: `sm | md | lg`

### Overlays e feedback

- Modal
  - `size`: `sm | md | lg`
  - `a11y`: `role`, `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`, `trapFocus`, `closeOnEscape`, `initialFocusSelector`
  - defaults: `role=dialog`, `trapFocus=true`, `closeOnEscape=true`
- Toast
  - `variant`: `info | success | warning | error`
  - `position`: `top-right | top-left | bottom-right | bottom-left`

## A11y (Modal)

A lib expõe utilitários de acessibilidade para overlay:

- `createModalFocusTrap`
- `getModalFocusableElements`
- `handleModalKeyboardNavigation`

Comportamentos cobertos:

- focus trap com `Tab` e `Shift+Tab`
- fechamento por `Escape` (configurável)
- restauração de foco ao fechar

## Tema e tokens

Todos os estilos da lib usam `var(--...)` para consumir `ui-tokens` / `ui-theme`.

Exemplo de alternância de tema:

```ts
import { UiThemeService } from '@shared/ui-theme';

constructor(private readonly theme: UiThemeService) {}

setLight(): void {
  this.theme.setTheme('light');
}

setDark(): void {
  this.theme.setTheme('dark');
}
```

## Boundaries

A lib não deve importar `apps/*` ou `libs/tools/*`.

Uso esperado:

- Shell e Tools consomem apenas os contratos públicos desta lib.
- Decisões de autorização continuam na Access Layer (fora de UI components).

## Evidências de validação

- specs de primitives/overlays em:
  - `button/button.spec.ts`
  - `modal/modal.spec.ts`
  - `toast/toast.spec.ts`
  - `ui-components.spec.ts`
- validação de tokenização de estilos em `ui-components.spec.ts`
