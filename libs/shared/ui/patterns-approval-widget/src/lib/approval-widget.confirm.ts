import { ApprovalAction, ApprovalSubjectRef, ApprovalWidgetUiOptions } from './approval-widget.model';

export interface ApprovalConfirmRequest {
  action: ApprovalAction;
  subject: ApprovalSubjectRef;
  message: string;
}

export type ApprovalConfirmFn = (request: ApprovalConfirmRequest) => boolean | Promise<boolean>;

export async function requestApprovalConfirmation(
  action: ApprovalAction,
  subject: ApprovalSubjectRef,
  uiOptions?: ApprovalWidgetUiOptions,
  confirmFn?: ApprovalConfirmFn,
): Promise<boolean> {
  const needsConfirmation = uiOptions?.confirmActions?.[action] ?? false;
  if (!needsConfirmation) {
    return true;
  }

  const request: ApprovalConfirmRequest = {
    action,
    subject,
    message: buildConfirmationMessage(action, subject),
  };

  if (confirmFn) {
    return Promise.resolve(confirmFn(request));
  }

  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(request.message);
  }

  return false;
}

function buildConfirmationMessage(action: ApprovalAction, subject: ApprovalSubjectRef): string {
  const subjectLabel = subject.title || `${subject.type} ${subject.id}`;
  switch (action) {
    case 'reject':
      return `Confirmar rejeição de ${subjectLabel}?`;
    case 'requestChanges':
      return `Confirmar solicitação de ajustes para ${subjectLabel}?`;
    case 'approve':
    default:
      return `Confirmar aprovação de ${subjectLabel}?`;
  }
}
