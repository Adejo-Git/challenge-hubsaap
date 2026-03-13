import { StandardError } from '@hub/error-model';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changesRequested' | 'blocked';

export type ApprovalAction = 'approve' | 'reject' | 'requestChanges';

export interface ApprovalSubjectRef {
  id: string;
  type: string;
  title?: string;
}

export interface ApprovalHistoryItem {
  id: string;
  action: ApprovalAction;
  actor: string;
  timestamp: string;
  comment?: string;
}

export interface ApprovalWidgetLabels {
  approve?: string;
  reject?: string;
  requestChanges?: string;
  cancel?: string;
  comment?: string;
}

export interface ApprovalWidgetUiOptions {
  compact?: boolean;
  requireCommentOnReject?: boolean;
  requireCommentOnRequestChanges?: boolean;
  confirmActions?: Partial<Record<ApprovalAction, boolean>>;
  labels?: ApprovalWidgetLabels;
}

export type ApprovalPolicyHints = Partial<Record<ApprovalAction, string>>;

export interface ApprovalDecisionPayload {
  subject: ApprovalSubjectRef;
  action: ApprovalAction;
  comment?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalValidationError extends StandardError {
  field: 'comment';
  action: ApprovalAction;
}
