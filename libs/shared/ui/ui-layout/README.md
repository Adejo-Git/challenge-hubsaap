# UiLayout

Componentes estruturais de layout do Hub: `Topbar`, `Sidebar`, `RightPanel` e `ContentFrame`.

## Objetivo

Fornecer blocos reutilizáveis para composição de layout por slots, sem acoplamento a domínio, autorização ou navegação calculada.

## Componentes

- `ui-layout-shell`: organiza os 4 slots principais.
- `ui-topbar`: barra superior com suporte a estado sticky.
- `ui-sidebar`: suporte a collapsed e drawer mobile.
- `ui-right-panel`: painel lateral com overlay, foco inicial e fechamento por `Escape`.
- `ui-content-frame`: frame com padding e scroll interno padronizados.

## Estados principais

- Sidebar: `collapsed`, `mobile`, `mobileOpen`.
- RightPanel: `state.open`.

## Acessibilidade implementada

- Sidebar com `role="navigation"` e `aria-hidden` no modo mobile fechado.
- Sidebar emite `closeRequest` ao pressionar `Escape` (quando drawer mobile está aberto).
- Sidebar move foco para o container ao abrir no mobile e restaura foco ao elemento originador ao fechar.
- RightPanel com `role="dialog"`, `aria-hidden`, `aria-modal` (quando aberto) e foco inicial no painel ao abrir.
- RightPanel restaura foco ao elemento originador ao fechar.
- RightPanel suporta nome acessível via `ariaLabel` (default) ou `ariaLabelledby` (quando houver heading visível).
- RightPanel fecha com clique no overlay e com `Escape`.

## Contrato de nomeação do RightPanel

- Preferir `ariaLabelledby` apontando para um heading visível dentro do conteúdo do painel.
- Quando não houver heading visível, usar `ariaLabel` para nomear o diálogo.
- `autoLabelFromHeading` (default `true`) tenta detectar `h1/h2/h3` ou `[data-ui-right-panel-title]` e ligar automaticamente em `aria-labelledby`.
- Opcionalmente, usar `ariaDescribedby` para descrever o propósito/conteúdo do painel.

## Contrato de fallback de foco

- `ui-right-panel` e `ui-sidebar` restauram foco ao elemento originador ao fechar.
- Se o originador não existir mais no DOM, usam `focusFallbackSelector` (default: `[data-ui-focus-fallback], main, [role="main"], ui-content-frame`).
- Recomenda-se marcar um elemento estável do shell com `data-ui-focus-fallback`.

## Validação manual de leitor de tela (opcional)

- NVDA (Windows): abrir/fechar painel e confirmar anúncio de nome via heading (`aria-labelledby`) e retorno de foco.
- JAWS (Windows): repetir cenário com navegação por heading e Escape.
- VoiceOver (macOS): validar leitura do diálogo com `aria-modal` e descrição quando `ariaDescribedby` estiver presente.

## Uso básico

```html
<ui-layout-shell [state]="layoutState">
  <ui-topbar>...</ui-topbar>
  <ui-sidebar
    [collapsed]="layoutState.sidebar?.collapsed"
    [mobile]="layoutState.isMobile"
    [mobileOpen]="layoutState.sidebar?.mobileOpen"
    (closeRequest)="onCloseSidebarMobile()"
  >
    ...
  </ui-sidebar>

  <ui-content-frame [padded]="true" [scrollable]="true">...
  </ui-content-frame>

  <ui-right-panel
    [state]="layoutState.rightPanel || { open: false }"
    (close)="onCloseRightPanel()"
  >
    ...
  </ui-right-panel>
</ui-layout-shell>
```

## Notas de performance

- `ui-content-frame` usa `overflow: auto` para contenção de scroll.
- Para listas longas no menu (projetadas por conteúdo), a virtualização/paginação é responsabilidade do renderer de menu da tool.

## Notas de design system

- Os componentes usam CSS vars de tema/tokens (`--color-*`, `--spacing-*`, `--z-index-*`, `--layout-*`).
- Fallbacks numéricos existem apenas como valor default de CSS vars (ex.: `--layout-topbar-height`, `--layout-sidebar-width`, `--layout-right-panel-width`, `--layout-border-width`, `--accessibility-motionBase`).
- Não adicionar hardcodes visuais diretos fora do padrão `var(--token, fallback)`.
