# ui-icons-assets

Catálogo e pipeline de ícones/assets compartilhados do Hub.

## Objetivo
- Fornecer API estável para ícones SVG usados por Shell e Tools via `hub-icon`.
- Garantir consistência visual, acessibilidade e governança de naming.
- Manter estratégia de bundle com imports controlados por ícone.

## Contrato público
- Nomes permitidos: `icon-names.ts`.
- Registro de loaders por nome: `icon-registry.ts`.
- Nomes permitidos de assets estáticos: `asset-names.ts`.
- Registro de assets estáticos por nome: `asset-registry.ts`.
- Componente de consumo: `hub-icon` em `icon.component.ts`.

## Convenção de naming
- Formato recomendado: `dominio.item`.
- Exemplos atuais: `nav.home`, `status.success`, `status.error`.
- Regras:
  - manter nomes curtos e semânticos;
  - evitar nomes acoplados a tela específica;
  - versionar mudanças de contrato em `icon-names.ts`.

## Governança de assets
- Licença/origem: cada novo asset deve vir com origem documentada no PR (fonte + direito de uso).
- Revisão: asset novo exige revisão de design system antes de merge.
- Versionamento: mudanças breaking em nomes públicos devem ser tratadas como alteração de contrato.
- Escopo: assets compartilhados e agnósticos de tool; evitar acoplamento com fluxo de um tool específico.

## Segurança (obrigatório)
- Todo SVG deve passar por `sanitizeSvg` antes de ir para renderização.
- O componente renderiza apenas markup previamente sanitizado (sem `bypassSecurityTrustHtml`).
- Motivo: preservar renderização de SVG legítimo sem abrir mão da mitigação XSS e reduzir risco humano de manutenção.
- Não usar `innerHTML` para ícones fora do fluxo centralizado do `IconComponent`.

## Checklist de governança para PR
- [ ] Origem do asset documentada (link/fonte)
- [ ] Licença/direito de uso registrado
- [ ] Aprovação de design system registrada
- [ ] Impacto de versionamento avaliado (breaking/non-breaking)
- [ ] Naming validado contra contrato público (`icon-names.ts` / `asset-names.ts`)

## Acessibilidade
- Decorativo: `aria-hidden="true"` e sem `role`.
- Informativo: `role="img"` e `aria-label` (ou `title` quando fornecido).

## Como adicionar novo ícone
1. Adicionar o arquivo SVG convertido no diretório `ui-icons/`.
2. Exportar a constante SVG no arquivo do ícone (ex.: `status-warning.svg.ts`).
3. Incluir o novo nome em `icon-names.ts`.
4. Registrar loader em `icon-registry.ts` usando import dinâmico por ícone.
5. Adicionar/ajustar testes em `ui-icons-assets.spec.ts` (render + aria + sanitização).

## Como adicionar novo asset estático (logo/ilustração)
1. Adicionar arquivo no diretório `ui-assets/`.
2. Exportar constante do asset no arquivo correspondente (ex.: `brand-hub-logo-mono.svg.ts`).
3. Incluir o nome em `asset-names.ts`.
4. Registrar loader em `asset-registry.ts` usando import dinâmico.
5. Adicionar/ajustar testes de registry/load em `ui-icons-assets.spec.ts`.

## Assets disponíveis
- `brand.hub.logo.mono`

## Validação recomendada
- `npx nx lint ui-icons-assets --skip-nx-cache`
- `npx nx test ui-icons-assets --runInBand --skip-nx-cache`
