# ui-tokens

Fonte única de design tokens do Hub para consumo em Tailwind e/ou CSS variables.

## Escopo
- Define tokens semânticos de cores (`brand`, `surface`, `text`, `border`, `status`).
- Define escalas base (`spacing`, `radius`, `typography`, `shadows`, `zIndex`, `accessibility`).
- Exporta gerador de CSS vars (`generateCssVars`) e preset Tailwind (`uiTokensPreset`).

## Contrato de chaves estáveis
- Contrato formal e versionado: `CONTRACT.md` (`contractVersion: 1`).
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
- As chaves publicadas em `UiTokens` devem ser tratadas como contrato público.

## Versionamento e breaking changes
- Mudança de valor sem alterar chave existente: **minor**.
- Inclusão de novas chaves opcionais: **minor**.
- Renomear/remover chave existente, mudar semântica da chave ou prefixo de CSS var: **major**.
- Toda alteração de contrato deve atualizar testes de contrato em `ui-tokens.spec.ts`.

## Notas de consumo
- `ui-theme` consome `ui-tokens` como fonte de tema.
- `ui-tokens` não aplica tema em runtime e não contém componentes/layout.
- A escala atual mistura unidades `px` e `rem` em typography por decisão de compatibilidade legada.
- Racional da decisão:
  - `px` preserva fidelidade visual em componentes legados e snapshots existentes.
  - `rem` é mantido em tamanhos de heading para melhor adaptação ao tamanho-base de fonte do usuário.
- Impacto para consumidores:
  - Evitar normalização automática de unidades ao consumir `fontSize`.
  - Alterações de unidade devem ser tratadas como possível mudança de contrato visual e avaliadas via testes de regressão.
