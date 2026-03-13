# UiTokens Contract

contractVersion: 1

## Objetivo
Contrato público e estável para consumo de tokens de design por Tailwind e CSS variables.

## Chaves canônicas
- Prefixos de CSS vars:
  - `--color-*`
  - `--spacing-*`
  - `--radius-*`
  - `--font-family-*`
  - `--font-size-*`
  - `--line-height-*`
  - `--font-weight-*`
  - `--shadow-*`
  - `--z-index-*`
  - `--accessibility-*`

## Compatibilidade e breaking change
- Mudança de valor sem alterar chave existente: **minor**.
- Inclusão de novas chaves opcionais: **minor**.
- Renomear/remover chave existente, mudar semântica da chave ou prefixo de CSS var: **major**.
- Alterações de contrato devem atualizar testes de contrato em `ui-tokens.spec.ts`.

## Exemplo de consumo

### Gerar CSS vars
```ts
import { generateCssVars, UI_TOKENS } from '@hub/shared/ui/ui-tokens';

const cssVars = generateCssVars(UI_TOKENS);
```

### Consumir preset Tailwind
```ts
import { uiTokensPreset } from '@hub/shared/ui/ui-tokens';

export default {
  presets: [uiTokensPreset],
};
```

## Verificação
- `npx nx test ui-tokens --runInBand`
- `npx nx lint ui-tokens --skip-nx-cache`
