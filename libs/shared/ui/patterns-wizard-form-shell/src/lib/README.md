# PatternsWizardFormShell

Pattern reutilizável de wizard multi-step com Reactive Forms, navegação controlada e proteção de saída dirty.

## 1) Resumo do componente

- **Selector:** `hub-wizard-form-shell`
- **Objetivo:** padronizar fluxos de entrada guiada (criação/edição) com steps e validação por etapa.
- **Escopo:** somente orquestração de UI/estado do wizard; sem regras de domínio e sem submit HTTP.
- **Arquivos principais:**
  - `wizard-form-shell.component.ts`
  - `wizard-form-shell.validators.ts`
  - `wizard-form-shell.util.ts`
  - `wizard-dirty-guard.util.ts`

## 2) Responsabilidades

- Renderizar stepper + conteúdo por template + footer de ações.
- Controlar `back/next/jump` com regras de step habilitado/bloqueado.
- Executar validação por etapa e bloquear avanço quando inválido.
- Expor estados para consumidor (`validationState`, `navigationState`).
- Proteger saída quando dirty (`canExit` + util `canDeactivateWizard`).

## 3) Inputs e Outputs

### Inputs
- `steps: WizardStep[]`
- `form: AbstractControl | null`
- `stepValidators?: WizardStepValidators`
- `validationMessages?: Record<string, string> | ((errorKey, errorValue) => string | null | undefined)`
- `canExit?: WizardCanExitHandler`
- `initialStepId?: string`
- `layoutOptions?: WizardLayoutOptions`
- `isBusy?: boolean`
- `errorMessage?: string | null`

> **Nota de i18n:** o fallback interno de mensagens de validação é PT-BR. Em aplicações multilíngues, passe sempre `validationMessages` (mapa ou resolver) para alinhar com o idioma do produto.

> **Nota de validação assíncrona:** validators customizados recebem `context.signal` (AbortSignal) para cancelamento cooperativo quando uma nova validação substitui a anterior.

### Outputs
- `stepChange` — transição `from/to` e motivo (`next|back|jump`).
- `finish` — conclusão com `formSnapshot` e estado do wizard.
- `cancel` — abandono com `reason`, `dirty` e `stepId`.
- `validationState` — validade/sujeira/toque/erros da etapa atual.
- `navigationState` — `canBack/canNext/canFinish/isBusy/isBlocked`.

## 3.1) Contrato de UI tokens/theme

O pattern depende de variáveis semânticas providas por `@hub/shared/ui-tokens` e aplicadas por `@hub/shared/ui-theme` no host da aplicação (Shell/Tool).

Tokens esperados no CSS do host:

- spacing: `--spacing-2xs`, `--spacing-xs`, `--spacing-sm`, `--spacing-md`
- radius/border: `--radius-sm`, `--radius-md`, `--border-width-sm`
- texto/surface/border: `--color-text-primary`, `--color-text-secondary`, `--color-surface-primary`, `--color-surface-secondary`, `--color-border-default`, `--color-border-subtle`, `--color-border-strong`, `--color-border-brand`
- estado: `--color-border-danger`, `--color-surface-danger-soft`, `--opacity-disabled`
- ação: `--color-action-primary-bg`, `--color-action-primary-fg`
- tipografia: `--font-label-md`, `--font-body-sm`

## 4) Como usar

### Exemplo mínimo

```html
<hub-wizard-form-shell [steps]="steps" [form]="form" [canExit]="canExitHandler">
  <ng-template wizardStep="dados">
    <input [formControl]="form.controls.dados" />
  </ng-template>

  <ng-template wizardStep="config">
    <input [formControl]="form.controls.config" />
  </ng-template>
</hub-wizard-form-shell>
```

### Exemplo de steps

```ts
steps: WizardStep[] = [
  { id: 'dados', title: 'Dados', controlPath: 'dados' },
  { id: 'config', title: 'Configuração', controlPath: 'config' },
  { id: 'resumo', title: 'Resumo', optional: true, controlPath: 'resumo' },
];
```

### Integração de saída dirty

```ts
canExitHandler = ({ dirty }: { dirty: boolean }) => {
  if (!dirty) return true;
  return window.confirm('Existem alterações não salvas. Deseja sair?');
};
```

`canExit` também pode retornar `Observable<boolean>`.

### Integração com rota (`CanDeactivate`)

Use o util `canDeactivateWizard` para reaproveitar a mesma regra do `canExit` em guards de rota.

```ts
import { canDeactivateWizard } from '@hub/patterns-wizard-form-shell';

const routes: Routes = [
  {
    path: 'cadastro',
    component: CadastroComponent,
    canDeactivate: [
      (component: WizardFormShellComponent) => canDeactivateWizard(component, { reason: 'route-leave' }),
    ],
  },
];
```

## 5) Critérios de validação

- Step inválido bloqueia avanço.
- `back/next/jump` respeitam `enabled/blocked`.
- `finish` emite snapshot do form e estado atual.
- `completedStepIds` reflete etapas validadas com sucesso ao longo da sessão.
- `isBusy` desabilita navegação e previne double-submit.
- `canExit` protege saída com retorno sync/async.

## 5.1) Comportamento de teclado no stepper

- `ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End`: movem foco entre steps habilitados (não trocam a etapa ativa).
- `Enter` e `Espaço`: ativam o step focado (jump), respeitando bloqueios de validação.
- Steps desabilitados expõem feedback por `title` e `aria-label` com motivo de indisponibilidade.

## 5.2) Layout (`stepperPosition`)

- `layoutOptions.stepperPosition = 'top'` (default): stepper acima do conteúdo.
- `layoutOptions.stepperPosition = 'left'`: stepper em coluna lateral, mantendo footer de ações à direita.

## 6) Troubleshooting (causas comuns)

- **Não avança para o próximo step**
  - Verifique `controlPath` e erros do controle (`required`, etc.).
- **Etapa não renderiza template**
  - Verifique se `wizardStep="id"` bate exatamente com `steps[].id`.
- **Cancelar não funciona**
  - Se o form está dirty e `canExit` retorna `false`, o cancelamento é bloqueado.
- **Botões sempre desabilitados**
  - Verifique `isBusy` e `enabled/blocked` dos steps.

## Anti-patterns (o que NÃO fazer)

- Não fazer `HttpClient`/submit dentro do pattern.
- Não colocar regra de domínio (ex.: cálculo de negócio, mapeamento DTO) no componente.
- Não avaliar permissões diretamente no wizard (use access-layer/guards).
- Não criar armazenamento paralelo de sessão/contexto dentro da Tool.
- Não hardcodear design fora dos tokens/tema existentes.

## Evidência de implementação atual

- Unit: `wizard-form-shell.spec.ts`
- Integration: `wizard-form-shell.integration.spec.ts`
- Storybook: `wizard-form-shell.stories.ts`

## Public API

- Entry point: `libs/patterns-wizard-form-shell/src/index.ts`
- Módulo: `WizardFormShellModule`
