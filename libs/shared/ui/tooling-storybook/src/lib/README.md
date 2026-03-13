# tooling-storybook

Lib de tooling para Storybook do Hub-Saap.

Propósito
--------
Centralizar preset, decorators, mocks e convenções para reduzir duplicações entre libs de UI e patterns.

Como usar
---------
1. Importar o preset em `main.ts` do Storybook da lib consumidora:

```js
import hubPreset from '@hub/tooling-storybook/dist/storybook-preset';
export const main = { ...hubPreset };
```

2. Usar `preview.ts` fornecido (ou copiar decorators `withTheme`/`withLayout`) para aplicar tema e layout.

3. Para stories que precisem de contexto, importe `createMockContext`:

```ts
import { createMockContext } from '@hub/tooling-storybook';
const ctx = createMockContext({ session: { userId: 'alice' } });
```

MSW
---
Handlers básicos estão em `mocks/msw.handlers.ts`. MSW é opcional — ative explicitamente quando necessário.

Guia de convenções (resumo)
--------------------------
- Naming: `ComponentName.stories.tsx` (coloque dentro de `src/lib/` da lib consumidora).
- Categories: `Components/`, `Patterns/`.
- Args: documente `args` e `argTypes` para cada story.
- A11y: habilitar addon `@storybook/addon-a11y` e rodar checks manuais antes do merge.

Checklist de PR
---------------
- Preset usado pela lib consumidora?
- Stories renderizam localmente com tokens/icones?
- Se MSW habilitado, handlers mínimos documentados?
- README atualizado com instruções de uso e evidências (logs / screenshots).

Integração com Tokens / Theme / Icons
------------------------------------
Recomendamos integrar explicitamente as seguintes libs no consumidor ou no workspace para garantir consistência visual:

- `@hub/ui-theme` — exporta `applyTheme(root: HTMLElement, variant: string)` para aplicar CSS vars/tokens dinamicamente.
- `@hub/ui-tokens` — fornece `fonts` (URLs) e tokens exportáveis.
- `@hub/ui-icons-assets` ou `ui-icons-assets` — exporta `icons` e (opcional) `register(icons)`.

Como o preset usa assets:

1. `preview.ts` chama `loadAssets()` e tentará injetar `fonts` como `<link rel="stylesheet" href="...">`.
2. `preview.ts` também chama `registerIcons(fn)`; se a aplicação expuser `globalThis.registerHubIcons`, os ícones serão registrados automaticamente; caso contrário ficam em `globalThis.__hub_icons` como fallback.
3. Para integração completa, adicione as dependências acima no `package.json` do workspace ou da lib consumidora e garanta que `ui-tokens.fonts` contenha URLs acessíveis ao Storybook.

Exemplo rápido (package.json consumidor):

```json
{
	"dependencies": {
		"@hub/ui-theme": "^1.0.0",
		"@hub/ui-tokens": "^1.0.0",
		"@hub/ui-icons-assets": "^1.0.0"
	}
}
```

Checklist PR (detalhado)
-----------------------
- [ ] O preset foi referenciado pela lib consumidora (`main.ts` do Storybook).
- [ ] `preview` aplica `withTheme`/`withLayout` ou equivalente.
- [ ] Tokens/fontes carregam no preview (verificar `Network` e presença de fontes).
- [ ] Ícones estão registrados (`globalThis.registerHubIcons` chamado ou `globalThis.__hub_icons` preenchido).
- [ ] MSW handlers documentados e ativados apenas quando necessário.
- [ ] Adicionar logs/screenshots do `nx build-storybook <lib>` na PR como evidência.

Como validar localmente
-----------------------
1. Instale as dependências recomendadas (se ainda não estiverem no workspace).
2. No projeto consumidor execute:

```bash
npx nx storybook <lib-name>
```

3. Para validação CI, adicionar `npx nx build-storybook <lib-name>` no pipeline e anexar logs na PR.

Observações
-----------
Esta lib é apenas tooling — não contém componentes de produção. Não adicione dependências de runtime aqui.
