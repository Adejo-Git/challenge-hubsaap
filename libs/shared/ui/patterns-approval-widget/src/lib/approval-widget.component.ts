import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiLayoutModule } from '@hub/shared/ui-layout';

import { ApprovalConfirmFn, requestApprovalConfirmation } from './approval-widget.confirm';
import {
  ApprovalAction,
  ApprovalDecisionPayload,
  ApprovalHistoryItem,
  ApprovalPolicyHints,
  ApprovalStatus,
  ApprovalSubjectRef,
  ApprovalValidationError,
  ApprovalWidgetUiOptions,
} from './approval-widget.model';
import { buildDecisionPayload, isCommentRequired, validateActionComment } from './approval-widget.util';

@Component({
  selector: 'hub-approval-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, UiLayoutModule],
  templateUrl: './approval-widget.component.html',
  styleUrls: ['./approval-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalWidgetComponent {
  @Input({ required: true }) subject!: ApprovalSubjectRef;
  @Input({ required: true }) status: ApprovalStatus = 'pending';
  @Input({ required: true }) availableActions: ApprovalAction[] = [];

  @Input() policyHints?: ApprovalPolicyHints;
  @Input() history: ApprovalHistoryItem[] | null = null;
  @Input() busy = false;
  @Input() uiOptions: ApprovalWidgetUiOptions = {};
  @Input() metadata?: Record<string, unknown>;
  @Input() confirmFn?: ApprovalConfirmFn;

  @Output() readonly approve = new EventEmitter<ApprovalDecisionPayload>();
  @Output() readonly reject = new EventEmitter<ApprovalDecisionPayload>();
  @Output() readonly requestChanges = new EventEmitter<ApprovalDecisionPayload>();
  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly validationError = new EventEmitter<ApprovalValidationError>();

  comment = '';
  private submitting = false;

  get isBusy(): boolean {
    return this.busy || this.submitting;
  }

  get statusLabel(): string {
    switch (this.status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'changesRequested':
        return 'Ajustes solicitados';
      case 'blocked':
        return 'Bloqueado';
      case 'pending':
      default:
        return 'Pendente';
    }
  }

  get visibleHistory(): ApprovalHistoryItem[] {
    return this.history ?? [];
  }

  hasAction(action: ApprovalAction): boolean {
    return this.availableActions.includes(action);
  }

  getActionLabel(action: ApprovalAction): string {
    const labels = this.uiOptions.labels;
    if (action === 'approve') {
      return labels?.approve || 'Aprovar';
    }

    if (action === 'reject') {
      return labels?.reject || 'Rejeitar';
    }

    return labels?.requestChanges || 'Solicitar ajustes';
  }

  isCommentRequiredFor(action: ApprovalAction): boolean {
    return isCommentRequired(action, this.uiOptions);
  }

  async onActionClick(action: ApprovalAction): Promise<void> {
    if (this.isBusy || !this.hasAction(action)) {
      return;
    }

    const error = validateActionComment(action, this.comment, this.uiOptions);
    if (error) {
      this.validationError.emit(error);
      return;
    }

    this.submitting = true;
    try {
      const confirmed = await requestApprovalConfirmation(action, this.subject, this.uiOptions, this.confirmFn);
      if (!confirmed) {
        return;
      }

      const payload = buildDecisionPayload(this.subject, action, this.comment, this.metadata);
      this.emitDecision(payload);
      this.comment = '';
    } finally {
      this.submitting = false;
    }
  }

  onCancelClick(): void {
    if (this.isBusy) {
      return;
    }

    this.cancel.emit();
  }

  private emitDecision(payload: ApprovalDecisionPayload): void {
    if (payload.action === 'approve') {
      this.approve.emit(payload);
      return;
    }

    if (payload.action === 'reject') {
      this.reject.emit(payload);
      return;
    }

    this.requestChanges.emit(payload);
  }
}
