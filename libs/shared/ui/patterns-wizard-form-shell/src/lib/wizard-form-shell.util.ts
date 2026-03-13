import { WizardStep } from './wizard-form-shell.model';

export function isStepEnabled(step: WizardStep | undefined): boolean {
  if (!step) {
    return false;
  }

  return step.enabled !== false && step.blocked !== true;
}

export function getEnabledSteps(steps: WizardStep[]): WizardStep[] {
  return steps.filter((step) => isStepEnabled(step));
}

export function getInitialStepIndex(steps: WizardStep[], initialStepId?: string | null): number {
  if (steps.length === 0) {
    return -1;
  }

  if (initialStepId) {
    const requestedIndex = steps.findIndex((step) => step.id === initialStepId && isStepEnabled(step));
    if (requestedIndex >= 0) {
      return requestedIndex;
    }
  }

  return steps.findIndex((step) => isStepEnabled(step));
}

export function getNextEnabledStepIndex(steps: WizardStep[], currentIndex: number): number {
  for (let index = currentIndex + 1; index < steps.length; index += 1) {
    if (isStepEnabled(steps[index])) {
      return index;
    }
  }

  return -1;
}

export function getPreviousEnabledStepIndex(steps: WizardStep[], currentIndex: number): number {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (isStepEnabled(steps[index])) {
      return index;
    }
  }

  return -1;
}

export function canJumpToStep(steps: WizardStep[], targetIndex: number): boolean {
  const target = steps[targetIndex];
  return isStepEnabled(target);
}

export function computeCanBack(steps: WizardStep[], currentIndex: number, isBusy: boolean): boolean {
  if (isBusy) {
    return false;
  }

  return getPreviousEnabledStepIndex(steps, currentIndex) >= 0;
}

export function computeCanNext(steps: WizardStep[], currentIndex: number, isBusy: boolean, stepValid: boolean): boolean {
  if (isBusy || !stepValid) {
    return false;
  }

  return getNextEnabledStepIndex(steps, currentIndex) >= 0;
}

export function computeCanFinish(
  steps: WizardStep[],
  currentIndex: number,
  isBusy: boolean,
  stepValid: boolean
): boolean {
  if (isBusy || !stepValid) {
    return false;
  }

  return getNextEnabledStepIndex(steps, currentIndex) < 0;
}
