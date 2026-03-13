import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

import { WizardFormShellComponent } from './wizard-form-shell.component';
import { WizardStep } from './wizard-form-shell.model';

describe('WizardFormShellComponent', () => {
  const steps: WizardStep[] = [
    {
      id: 'dados',
      title: 'Dados',
      controlPath: 'dados',
    },
    {
      id: 'config',
      title: 'Configuração',
      controlPath: 'config',
    },
    {
      id: 'resumo',
      title: 'Resumo',
      optional: true,
      controlPath: 'resumo',
    },
  ];

  function createComponent(): WizardFormShellComponent {
    const cdr = {
      markForCheck: jest.fn(),
    } as unknown as ChangeDetectorRef;

    const component = new WizardFormShellComponent(cdr);
    component.steps = steps;
    component.form = new FormGroup({
      dados: new FormControl('', [Validators.required]),
      config: new FormControl('', [Validators.required]),
      resumo: new FormControl(''),
    });
    component.ngOnChanges({
      steps: {
        currentValue: steps,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    return component;
  }

  it('deve bloquear avanço quando step atual estiver inválido', async () => {
    const component = createComponent();
    const events: string[] = [];
    component.stepChange.subscribe((event) => events.push(event.reason));

    await component.onNext();

    expect(component.currentStepIndex).toBe(0);
    expect(events.length).toBe(0);
  });

  it('deve avançar para próximo step quando etapa atual estiver válida', async () => {
    const component = createComponent();
    component.form?.get('dados')?.setValue('ok');

    await component.onNext();

    expect(component.currentStepIndex).toBe(1);
  });

  it('deve disparar finish com snapshot do form no último step', async () => {
    const component = createComponent();

    component.form?.get('dados')?.setValue('ok');
    await component.onNext();
    component.form?.get('config')?.setValue('ok');
    await component.onNext();

    const finishSpy = jest.fn();
    component.finish.subscribe(finishSpy);
    await component.onFinish();

    expect(finishSpy).toHaveBeenCalledTimes(1);
    expect(finishSpy.mock.calls[0][0].formSnapshot).toEqual({
      dados: 'ok',
      config: 'ok',
      resumo: '',
    });
  });

  it('deve manter completedStepIds acumulado conforme validações bem-sucedidas', async () => {
    const component = createComponent();

    component.form?.get('dados')?.setValue('ok');
    await component.onNext();
    component.form?.get('config')?.setValue('ok');
    await component.onNext();

    expect(component.getState().completedStepIds).toEqual(['dados', 'config']);
  });

  it('deve respeitar busy state e impedir ações de navegação', async () => {
    const component = createComponent();
    component.form?.get('dados')?.setValue('ok');
    component.isBusy = true;

    await component.onNext();

    expect(component.currentStepIndex).toBe(0);
  });

  it('deve proteger saída dirty quando canExit negar', async () => {
    const component = createComponent();
    component.form?.markAsDirty();
    component.canExit = jest.fn().mockResolvedValue(false);

    const cancelSpy = jest.fn();
    component.cancel.subscribe(cancelSpy);

    await component.onCancel('user-cancel');

    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('deve permitir customização de mensagens de validação', async () => {
    const component = createComponent();
    component.validationMessages = {
      required: 'Obrigatório customizado.',
    };

    await component.onNext();

    expect(component.currentValidation.errors.messages).toContain('Obrigatório customizado.');
  });

  it('deve manter estado consistente em corrida de validação assíncrona', async () => {
    const component = createComponent();

    component.stepValidators = jest.fn(async () => {
      const value = component.form?.get('dados')?.value;
      await new Promise((resolve) => setTimeout(resolve, value === 'ok' ? 5 : 30));
      return value === 'ok';
    });

    component.form?.get('dados')?.setValue('bad');
    const first = component.onNext();
    component.form?.get('dados')?.setValue('ok');
    const second = component.onNext();

    await Promise.all([first, second]);

    expect(component.currentStepIndex).toBe(1);
    expect(['dados', 'config']).toContain(component.currentValidation.stepId);
  });

  it('deve disponibilizar AbortSignal para validações customizadas', async () => {
    const component = createComponent();
    const capturedSignals: AbortSignal[] = [];

    component.stepValidators = jest.fn(async (_step, _form, context) => {
      if (context?.signal) {
        capturedSignals.push(context.signal);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    });

    component.form?.get('dados')?.setValue('ok');
    const first = component.onNext();
    component.form?.get('dados')?.setValue('ok');
    const second = component.onNext();

    await Promise.all([first, second]);

    expect(capturedSignals.length).toBeGreaterThanOrEqual(2);
    expect(capturedSignals[0].aborted).toBe(true);
  });

  it('deve mover foco por teclado no stepper com ArrowRight sem ativar jump', async () => {
    const component = createComponent();
    component.form?.get('dados')?.setValue('ok');

    const event = {
      key: 'ArrowRight',
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.onStepKeydown(event, 0);

    expect(component.currentStepIndex).toBe(0);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('deve ativar jump no teclado com Enter', async () => {
    const component = createComponent();
    component.form?.get('dados')?.setValue('ok');

    const event = {
      key: 'Enter',
      preventDefault: jest.fn(),
    } as unknown as KeyboardEvent;

    component.onStepKeydown(event, 1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.currentStepIndex).toBe(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('deve evitar reentrância em cancelamento', async () => {
    const component = createComponent();
    component.form?.markAsDirty();
    const canExitMock = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return true;
    });
    component.canExit = canExitMock;

    const cancelSpy = jest.fn();
    component.cancel.subscribe(cancelSpy);

    await Promise.all([component.onCancel('user-cancel'), component.onCancel('user-cancel')]);

    expect(canExitMock).toHaveBeenCalledTimes(1);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
