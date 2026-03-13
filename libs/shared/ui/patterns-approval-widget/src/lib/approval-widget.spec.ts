import { ApprovalWidgetComponent } from './approval-widget.component';
import { ApprovalDecisionPayload, ApprovalSubjectRef } from './approval-widget.model';

describe('ApprovalWidgetComponent', () => {
  const subject: ApprovalSubjectRef = {
    id: 'item-1',
    type: 'gate',
    title: 'Gate de publicação',
  };

  function createComponent(): ApprovalWidgetComponent {
    const component = new ApprovalWidgetComponent();
    component.subject = subject;
    component.status = 'pending';
    component.availableActions = ['approve', 'reject', 'requestChanges'];
    component.uiOptions = {
      requireCommentOnReject: true,
      requireCommentOnRequestChanges: true,
    };
    return component;
  }

  it('respeita ações vindas de availableActions', () => {
    const component = createComponent();
    component.availableActions = ['approve'];

    expect(component.hasAction('approve')).toBe(true);
    expect(component.hasAction('reject')).toBe(false);
    expect(component.hasAction('requestChanges')).toBe(false);
  });

  it('emite approve com payload padronizado', async () => {
    const component = createComponent();
    const approveSpy = jest.fn<(payload: ApprovalDecisionPayload) => void>();
    component.approve.subscribe(approveSpy);
    component.comment = 'Tudo validado';

    await component.onActionClick('approve');

    expect(approveSpy).toHaveBeenCalledTimes(1);
    expect(approveSpy.mock.calls[0][0]).toMatchObject({
      subject,
      action: 'approve',
      comment: 'Tudo validado',
    });
  });

  it('valida comentário obrigatório para rejeição e emite validationError', async () => {
    const component = createComponent();
    const rejectSpy = jest.fn();
    const validationSpy = jest.fn();
    component.reject.subscribe(rejectSpy);
    component.validationError.subscribe(validationSpy);

    component.comment = '   ';
    await component.onActionClick('reject');

    expect(rejectSpy).not.toHaveBeenCalled();
    expect(validationSpy).toHaveBeenCalledTimes(1);
    expect(validationSpy.mock.calls[0][0].code).toBe('VALIDATION_ERROR');
  });

  it('não executa ação quando busy=true', async () => {
    const component = createComponent();
    const approveSpy = jest.fn();
    component.approve.subscribe(approveSpy);

    component.busy = true;
    await component.onActionClick('approve');

    expect(approveSpy).not.toHaveBeenCalled();
  });

  it('aplica confirmação opcional para rejeição', async () => {
    const component = createComponent();
    const rejectSpy = jest.fn();
    component.reject.subscribe(rejectSpy);
    component.uiOptions = {
      ...component.uiOptions,
      confirmActions: { reject: true },
    };

    component.confirmFn = () => false;
    component.comment = 'Reprovação por inconsistência';
    await component.onActionClick('reject');
    expect(rejectSpy).not.toHaveBeenCalled();

    component.confirmFn = () => true;
    await component.onActionClick('reject');
    expect(rejectSpy).toHaveBeenCalledTimes(1);
  });

  it('previne double-submit durante confirmação assíncrona', async () => {
    const component = createComponent();
    const approveSpy = jest.fn();
    component.approve.subscribe(approveSpy);

    let resolver!: (value: boolean) => void;
    component.uiOptions = {
      ...component.uiOptions,
      confirmActions: { approve: true },
    };
    component.confirmFn = () =>
      new Promise<boolean>((resolve) => {
        resolver = resolve;
      });

    const firstPromise = component.onActionClick('approve');
    await component.onActionClick('approve');
    expect(approveSpy).toHaveBeenCalledTimes(0);

    resolver(true);
    await firstPromise;
    expect(approveSpy).toHaveBeenCalledTimes(1);
  });

  it('emite requestChanges com payload padronizado', async () => {
    const component = createComponent();
    const requestChangesSpy = jest.fn();
    component.requestChanges.subscribe(requestChangesSpy);

    component.comment = 'Necessário ajustar checklist';
    await component.onActionClick('requestChanges');

    expect(requestChangesSpy).toHaveBeenCalledTimes(1);
    expect(requestChangesSpy.mock.calls[0][0]).toMatchObject({
      subject,
      action: 'requestChanges',
      comment: 'Necessário ajustar checklist',
    });
  });

  it('emite cancel quando usuário cancela e não está busy', () => {
    const component = createComponent();
    const cancelSpy = jest.fn();
    component.cancel.subscribe(cancelSpy);

    component.onCancelClick();

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
