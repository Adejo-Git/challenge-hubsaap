import { ActionKey } from './audit-ui.model';

export interface EvidenceHint {
  actionKey: ActionKey;
  checklist: string[];
  suggestedArtifacts: Array<'roteiro' | 'print' | 'gif'>;
}

const HINTS_BY_ACTION: Record<string, EvidenceHint> = {
  approve: {
    actionKey: 'approve',
    checklist: ['Capturar status anterior e novo', 'Registrar ator e horário', 'Manter correlationId visível no fluxo'],
    suggestedArtifacts: ['print', 'roteiro'],
  },
  publish: {
    actionKey: 'publish',
    checklist: [
      'Evidenciar validações pré-publicação',
      'Capturar tela final com confirmação',
      'Associar saída à entidade publicada',
    ],
    suggestedArtifacts: ['gif', 'print'],
  },
  'status-change': {
    actionKey: 'status-change',
    checklist: ['Mostrar transição de status', 'Mostrar motivo/resumo da mudança', 'Incluir correlationId para suporte'],
    suggestedArtifacts: ['print', 'roteiro'],
  },
};

const DEFAULT_HINT: EvidenceHint = {
  actionKey: 'custom',
  checklist: [
    'Registrar passo-a-passo mínimo do fluxo',
    'Anexar ao menos um print representativo',
    'Relacionar evidência com correlationId',
  ],
  suggestedArtifacts: ['roteiro', 'print'],
};

export function evidenceHints(actionKey: ActionKey): EvidenceHint {
  const found = HINTS_BY_ACTION[actionKey];
  if (found) return found;

  return {
    ...DEFAULT_HINT,
    actionKey,
  };
}
