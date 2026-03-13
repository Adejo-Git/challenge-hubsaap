import { ErrorCategory, ErrorCode, Severity } from '@hub/error-model';

import {
  ApprovalAction,
  ApprovalDecisionPayload,
  ApprovalSubjectRef,
  ApprovalValidationError,
  ApprovalWidgetUiOptions,
} from './approval-widget.model';

export function isCommentRequired(action: ApprovalAction, uiOptions?: ApprovalWidgetUiOptions): boolean {
  if (action === 'reject') {
    return uiOptions?.requireCommentOnReject ?? true;
  }

  if (action === 'requestChanges') {
    return uiOptions?.requireCommentOnRequestChanges ?? true;
  }

  return false;
}

export function validateActionComment(
  action: ApprovalAction,
  comment: string,
  uiOptions?: ApprovalWidgetUiOptions,
): ApprovalValidationError | undefined {
  if (!isCommentRequired(action, uiOptions)) {
    return undefined;
  }

  const normalizedComment = normalizeComment(comment);
  if (normalizedComment.length > 0) {
    return undefined;
  }

  return {
    field: 'comment',
    action,
    category: ErrorCategory.VALIDATION,
    code: ErrorCode.VALIDATION_ERROR,
    severity: Severity.WARNING,
    userMessage: 'Comentário é obrigatório para esta ação.',
    technicalMessage: `Missing required comment for action: ${action}`,
    timestamp: new Date().toISOString(),
    source: 'patterns-approval-widget',
  };
}

export function buildDecisionPayload(
  subject: ApprovalSubjectRef,
  action: ApprovalAction,
  comment: string,
  metadata?: Record<string, unknown>,
): ApprovalDecisionPayload {
  const normalizedComment = normalizeComment(comment);

  return {
    subject,
    action,
    comment: normalizedComment.length > 0 ? normalizedComment : undefined,
    metadata,
  };
}

function normalizeComment(comment: string): string {
  return (comment ?? '').trim();
}
