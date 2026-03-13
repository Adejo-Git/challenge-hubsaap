# UiTheme

Theming compartilhado do Hub para aplicação de tema em runtime (`light`/`dark`) com base em `ui-tokens`, persistência de preferência e estado reativo para consumo por Shell/Tools.

## Objetivo

- Aplicar tema inicial cedo no bootstrap (evitar flash perceptível).
- Gerenciar troca de tema de forma determinística.
- Persistir preferência com chave namespaced.
- Expor estado reativo (`watchTheme`) e snapshot (`snapshot`).

## API pública

- `UiThemeService`
  - `init()`
  - `setTheme(key)`
  - `toggleTheme()`
  - `watchTheme()`
  - `snapshot()`
  - `getThemeTokens(key?)`
- Storage helpers
  - `saveTheme`, `loadTheme`
  - `setThemeStorageAdapter`, `resetThemeStorageAdapter`
  - `THEME_STORAGE_KEY`

## Acessibilidade (escopo aplicável)

Como esta lib é de serviço (sem componente visual interativo), o foco de a11y é de governança de tema/tokens:

- Respeita `prefers-reduced-motion` no `init()`.
- Publica `reducedMotion` no estado reativo.
- Aplica variáveis CSS de acessibilidade derivadas de tokens (`--accessibility-*`), incluindo `contrastMinimum`.

## Uso no bootstrap (Shell)

A inicialização deve ocorrer no startup do app:

```ts
provideAppInitializer(() => {
  inject(UiThemeService).init();
});
```

## Como criar uma nova variant de tema

1. Definir tokens da variant em `ui-tokens` (sem hardcode fora da fonte de tokens).
2. Estender os tipos em `ui-theme.model.ts` (`ThemeVariant` e, se necessário, `ThemeKey`).
3. Registrar a variant no `UiThemeService` (mapa `themes`).
4. Garantir aplicação via `applyThemeStrategy` sem lógica de domínio.
5. Adicionar testes cobrindo `init`, `toggle/set`, persistência e variáveis de acessibilidade.

## Boundaries

- `ui-theme` depende apenas de libs compartilhadas (`@hub/shared/ui-tokens`) e do próprio contrato interno.
- Não contém auth, access decision, navegação nem IO remoto.

## Validação local

- `npx nx test ui-theme --runInBand`
- `npx nx lint ui-theme --skip-nx-cache`
