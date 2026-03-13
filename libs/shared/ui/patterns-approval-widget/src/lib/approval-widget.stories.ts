import { moduleMetadata } from '@storybook/angular';

import { ApprovalWidgetComponent } from './approval-widget.component';

const subject = {
  id: 'gate-42',
  type: 'publishGate',
  title: 'Publicação Q1',
};

export default {
  title: 'Patterns/ApprovalWidget',
  decorators: [
    moduleMetadata({
      imports: [ApprovalWidgetComponent],
    }),
  ],
};

export const PendingToApprove = {
  render: () => ({
    props: {
      subject,
      status: 'pending',
      availableActions: ['approve', 'reject', 'requestChanges'],
      uiOptions: {
        requireCommentOnReject: true,
        requireCommentOnRequestChanges: true,
      },
    },
    template: `
      <hub-approval-widget
        [subject]="subject"
        [status]="status"
        [availableActions]="availableActions"
        [uiOptions]="uiOptions"
      ></hub-approval-widget>
    `,
  }),
};

export const RejectWithRequiredComment = {
  render: () => ({
    props: {
      subject,
      status: 'pending',
      availableActions: ['reject'],
      uiOptions: {
        requireCommentOnReject: true,
        confirmActions: { reject: true },
        labels: {
          reject: 'Reprovar',
          comment: 'Motivo da reprovação',
        },
      },
      policyHints: {
        reject: 'Necessário justificar com comentário objetivo.',
      },
    },
    template: `
      <hub-approval-widget
        [subject]="subject"
        [status]="status"
        [availableActions]="availableActions"
        [uiOptions]="uiOptions"
        [policyHints]="policyHints"
      ></hub-approval-widget>
    `,
  }),
};

export const WithHistory = {
  render: () => ({
    props: {
      subject,
      status: 'changesRequested',
      availableActions: ['approve', 'requestChanges'],
      history: [
        {
          id: 'h1',
          action: 'requestChanges',
          actor: 'Ana',
          timestamp: '2026-03-03T09:10:00.000Z',
          comment: 'Favor revisar o checklist de compliance.',
        },
        {
          id: 'h2',
          action: 'approve',
          actor: 'Carlos',
          timestamp: '2026-03-02T14:25:00.000Z',
          comment: 'Aprovado após ajustes.',
        },
      ],
    },
    template: `
      <hub-approval-widget
        [subject]="subject"
        [status]="status"
        [availableActions]="availableActions"
        [history]="history"
      ></hub-approval-widget>
    `,
  }),
};
