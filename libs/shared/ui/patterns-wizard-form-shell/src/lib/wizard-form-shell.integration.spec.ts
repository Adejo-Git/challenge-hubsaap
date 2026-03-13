import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { WizardFormShellComponent, WizardStepTemplateDirective } from './wizard-form-shell.component';
import { WizardCanExitHandler, WizardStep } from './wizard-form-shell.model';

@Component({
  standalone: false,
  template: `
    <hub-wizard-form-shell [steps]="steps" [form]="form" [canExit]="canExit">
      <ng-template wizardStep="dados">
        <input data-testid="input-dados" [formControl]="form.controls.dados" />
      </ng-template>

      <ng-template wizardStep="config">
        <input data-testid="input-config" [formControl]="form.controls.config" />
      </ng-template>

      <ng-template wizardStep="resumo">
        <p data-testid="resumo">Resumo</p>
      </ng-template>
    </hub-wizard-form-shell>
  `,
})
class HostComponent {
  steps: WizardStep[] = [
    { id: 'dados', title: 'Dados', controlPath: 'dados' },
    { id: 'config', title: 'Config', controlPath: 'config' },
    { id: 'resumo', title: 'Resumo', optional: true, controlPath: 'resumo' },
  ];

  form = new FormGroup({
    dados: new FormControl('', Validators.required),
    config: new FormControl('', Validators.required),
    resumo: new FormControl(''),
  });

  canExit?: WizardCanExitHandler = undefined;
}

describe('WizardFormShell Integration', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let shellDebug: DebugElement;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HostComponent, WizardFormShellComponent, WizardStepTemplateDirective],
      imports: [ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    shellDebug = fixture.debugElement.query(By.directive(WizardFormShellComponent));
  }));

  it('percorre happy path e emite finish com snapshot', async () => {
    const shell = shellDebug.componentInstance as WizardFormShellComponent;

    const finishSpy = jest.fn();
    shell.finish.subscribe(finishSpy);

    // preencher primeiro step
    const inputDados = fixture.debugElement.query(By.css('[data-testid="input-dados"]')).nativeElement as HTMLInputElement;
    inputDados.value = 'valor';
    inputDados.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await shell.onNext();
    fixture.detectChanges();

    const inputConfig = fixture.debugElement.query(By.css('[data-testid="input-config"]')).nativeElement as HTMLInputElement;
    inputConfig.value = 'valor2';
    inputConfig.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    await shell.onNext();
    fixture.detectChanges();

    await shell.onFinish();
    fixture.detectChanges();

    expect(finishSpy).toHaveBeenCalledTimes(1);
    expect(finishSpy.mock.calls[0][0].formSnapshot).toMatchObject({ dados: 'valor', config: 'valor2', resumo: '' });
  });

  it('impede jump para step desabilitado', async () => {
    host.steps[1].enabled = false;
    fixture.detectChanges();
    const shell = shellDebug.componentInstance as WizardFormShellComponent;

    await shell.onJump('config');

    expect(shell.getActiveStepId()).toBe('dados');

    const disabledTab = shellDebug.query(By.css('#wizard-step-tab-config'));
    expect(disabledTab.attributes['aria-disabled']).toBe('true');
    expect(disabledTab.attributes['tabindex']).toBe('-1');
    expect(disabledTab.attributes['title']).toBe('Etapa indisponível no momento');
  });

  it('respeita canExit assíncrono (nega saída)', async () => {
    const shell = shellDebug.componentInstance as WizardFormShellComponent;
    host.canExit = () => Promise.resolve(false);
    fixture.detectChanges();

    host.form.markAsDirty();
    fixture.detectChanges();

    const cancelButton = shellDebug.query(By.css('.wizard-form-shell__btn--ghost')).nativeElement as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();

    // canExit negou, portanto evento cancel não deve ser emitido
    const cancelSpy = jest.fn();
    shell.cancel.subscribe(cancelSpy);
    // pequeno atraso para processar promessas
    await new Promise((r) => setTimeout(r, 10));

    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('expõe roles e atributos ARIA do stepper e painel', () => {
    const tablist = shellDebug.query(By.css('[role="tablist"]'));
    expect(tablist).toBeTruthy();

    const activeTab = shellDebug.query(By.css('[role="tab"][aria-selected="true"]'));
    expect(activeTab).toBeTruthy();
    expect(activeTab.attributes['aria-controls']).toContain('wizard-step-panel-');

    const panel = shellDebug.query(By.css('[role="tabpanel"]'));
    expect(panel).toBeTruthy();
    expect(panel.attributes['aria-labelledby']).toContain('wizard-step-tab-');
  });
});
