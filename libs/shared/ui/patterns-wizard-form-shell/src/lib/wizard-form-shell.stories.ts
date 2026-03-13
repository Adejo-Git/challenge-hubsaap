import { FormControl, FormGroup, Validators } from '@angular/forms';
import { moduleMetadata } from '@storybook/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { WizardLayoutOptions, WizardStep } from './wizard-form-shell.model';
import { WizardFormShellModule } from './wizard-form-shell.module';

const steps: WizardStep[] = [
  { id: 'dados', title: 'Dados', summary: 'Informações básicas', controlPath: 'dados' },
  { id: 'config', title: 'Configuração', summary: 'Parâmetros', controlPath: 'config' },
  { id: 'resumo', title: 'Resumo', summary: 'Revisão final', optional: true, controlPath: 'resumo' },
];

const buildForm = () =>
  new FormGroup({
    dados: new FormControl('', [Validators.required]),
    config: new FormControl('', [Validators.required]),
    resumo: new FormControl(''),
  });

export default {
  title: 'Patterns/WizardFormShell',
  decorators: [
    moduleMetadata({
      imports: [ReactiveFormsModule, WizardFormShellModule],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Pattern de Wizard/Form Shell com navegação por etapas, validação por step e proteção para saída dirty.',
      },
    },
  },
};

function buildTemplate(): string {
  return `
    <hub-wizard-form-shell
      [steps]="steps"
      [form]="form"
      [layoutOptions]="layoutOptions"
      [isBusy]="isBusy"
      [canExit]="canExit"
    >
      <ng-template wizardStep="dados">
        <label>Nome</label>
        <input [formControl]="form.controls.dados" />
      </ng-template>

      <ng-template wizardStep="config">
        <label>Configuração</label>
        <input [formControl]="form.controls.config" />
      </ng-template>

      <ng-template wizardStep="resumo">
        <p>Revise os dados e conclua.</p>
      </ng-template>
    </hub-wizard-form-shell>
  `;
}

export const HappyPath = {
  render: () => ({
    props: {
      steps,
      form: buildForm(),
      layoutOptions: { orientation: 'horizontal' } as WizardLayoutOptions,
      isBusy: false,
      canExit: () => true,
    },
    template: buildTemplate(),
  }),
};

export const StepInvalido = {
  render: () => ({
    props: {
      steps,
      form: buildForm(),
      layoutOptions: { orientation: 'horizontal' } as WizardLayoutOptions,
      isBusy: false,
      canExit: () => true,
    },
    template: buildTemplate(),
  }),
};

export const BusyState = {
  render: () => ({
    props: {
      steps,
      form: buildForm(),
      layoutOptions: { orientation: 'vertical', compact: true } as WizardLayoutOptions,
      isBusy: true,
      canExit: () => true,
    },
    template: buildTemplate(),
  }),
};
