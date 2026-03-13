import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';

import { ApprovalWidgetComponent } from './approval-widget.component';
import { ApprovalSubjectRef } from './approval-widget.model';

describe('ApprovalWidgetComponent Integration', () => {
  const subject: ApprovalSubjectRef = {
    id: 'gate-101',
    type: 'publishGate',
    title: 'Gate release',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApprovalWidgetComponent],
    }).compileComponents();
  });

  function createFixture(): ComponentFixture<ApprovalWidgetComponent> {
    const fixture = TestBed.createComponent(ApprovalWidgetComponent);
    const component = fixture.componentInstance;
    component.subject = subject;
    component.status = 'pending';
    component.availableActions = ['approve', 'reject', 'requestChanges'];
    component.uiOptions = {
      requireCommentOnReject: true,
      requireCommentOnRequestChanges: true,
    };
    fixture.detectChanges();
    return fixture;
  }

  function getButtonByText(fixture: ComponentFixture<ApprovalWidgetComponent>, label: string): HTMLButtonElement | null {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const found = buttons.find((button) => (button.nativeElement as HTMLButtonElement).textContent?.trim() === label);
    return (found?.nativeElement as HTMLButtonElement) ?? null;
  }

  it('renderiza somente ações de availableActions', waitForAsync(() => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const changeDetector = fixture.componentRef.injector.get(ChangeDetectorRef);

    component.availableActions = ['approve'];
    changeDetector.markForCheck();
    fixture.detectChanges();
    fixture.whenStable();

    expect(getButtonByText(fixture, 'Aprovar')).toBeTruthy();
    expect(getButtonByText(fixture, 'Rejeitar')).toBeNull();
    expect(getButtonByText(fixture, 'Solicitar ajustes')).toBeNull();
  }));

  it('emite approve ao clicar no botão com payload correto', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const approveSpy = jest.fn();
    component.approve.subscribe(approveSpy);

    component.comment = 'aprovado com ressalvas';
    fixture.detectChanges();

    // Simular ação do botão diretamente no componente e aguardar a Promise
    await component.onActionClick('approve');

    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(approveSpy.mock.calls[0][0]).toMatchObject({
      subject,
      action: 'approve',
      comment: 'aprovado com ressalvas',
    });
  });

  it('bloqueia reject sem comentário e emite validationError', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const validationSpy = jest.fn();
    const rejectSpy = jest.fn();
    component.validationError.subscribe(validationSpy);
    component.reject.subscribe(rejectSpy);

    const textarea = fixture.debugElement.query(By.css('#approval-comment')).nativeElement as HTMLTextAreaElement;
    textarea.value = '   ';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rejectButton = getButtonByText(fixture, 'Rejeitar');
    expect(rejectButton).toBeTruthy();

    rejectButton?.click();
    fixture.detectChanges();

    expect(validationSpy).toHaveBeenCalledTimes(1);
    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('bloqueia ações quando busy=true e não emite eventos', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const approveSpy = jest.fn();
    const rejectSpy = jest.fn();
    component.approve.subscribe(approveSpy);
    component.reject.subscribe(rejectSpy);

    // Marcar como busy (simulando submissão)
    component.busy = true;
    component.comment = 'test comment';
    fixture.detectChanges();

    // Validar que isBusy está true
    expect(component.isBusy).toBe(true);

    // Tentar disparar ações enquanto busy
    component.onActionClick('approve');
    component.onActionClick('reject');

    // Nenhuma ação deve ter sido emitida porque está busy
    expect(approveSpy).not.toHaveBeenCalled();
    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('aplica confirmação opcional para reject no fluxo de UI', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const rejectSpy = jest.fn();
    component.reject.subscribe(rejectSpy);

    component.uiOptions = {
      ...component.uiOptions,
      confirmActions: { reject: true },
    };
    component.confirmFn = () => false;

    const textarea = fixture.debugElement.query(By.css('#approval-comment')).nativeElement as HTMLTextAreaElement;
    textarea.value = 'Motivo de reprovação';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rejectButton = getButtonByText(fixture, 'Rejeitar');
    rejectButton?.click();
    fixture.detectChanges();

    await Promise.resolve();

    expect(rejectSpy).not.toHaveBeenCalled();
  });

  it('renderiza hints de policy e histórico quando fornecidos', waitForAsync(() => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    const changeDetector = fixture.componentRef.injector.get(ChangeDetectorRef);

    component.policyHints = {
      reject: 'Ação bloqueada sem justificativa detalhada.',
    };
    component.history = [
      {
        id: 'h1',
        action: 'requestChanges',
        actor: 'Ana',
        timestamp: '2026-03-03T09:00:00.000Z',
        comment: 'Ajustar seção de compliance.',
      },
    ];

    changeDetector.markForCheck();
    fixture.detectChanges();
    fixture.whenStable();

    const policySection = fixture.debugElement.query(By.css('.approval-widget__policy'));
    const historySection = fixture.debugElement.query(By.css('.approval-widget__history'));

    expect(policySection).toBeTruthy();
    expect(historySection).toBeTruthy();
    expect((historySection.nativeElement as HTMLElement).textContent).toContain('Ana');
  }));
});
