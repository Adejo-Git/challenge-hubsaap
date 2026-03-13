import { AbstractControl } from '@angular/forms';
import { Observable } from 'rxjs';

export type WizardNavigationReason = 'next' | 'back' | 'jump';

export interface WizardStep {
  id: string;
  title: string;
  summary?: string;
  optional?: boolean;
  enabled?: boolean;
  blocked?: boolean;
  controlPath?: string | string[];
}

export interface WizardLayoutOptions {
  orientation?: 'horizontal' | 'vertical';
  stepperPosition?: 'top' | 'left';
  compact?: boolean;
  hideStepSummary?: boolean;
}

export interface WizardStepErrorSummary {
  stepId: string;
  hasErrors: boolean;
  messages: string[];
}

export interface WizardValidationState {
  stepId: string | null;
  valid: boolean;
  invalid: boolean;
  dirty: boolean;
  touched: boolean;
  errors: WizardStepErrorSummary;
}

export interface WizardNavigationState {
  activeStepId: string | null;
  canBack: boolean;
  canNext: boolean;
  canFinish: boolean;
  isBusy: boolean;
  isBlocked: boolean;
}

export interface WizardState {
  currentStepIndex: number;
  totalSteps: number;
  completedStepIds: string[];
  validation: WizardValidationState;
  navigation: WizardNavigationState;
}

export interface WizardStepChangeEvent {
  fromStepId: string | null;
  toStepId: string | null;
  reason: WizardNavigationReason;
}

export interface WizardFinishEvent {
  stepId: string | null;
  formSnapshot: unknown;
  state: WizardState;
}

export interface WizardCancelEvent {
  reason: string;
  dirty: boolean;
  stepId: string | null;
}

export type WizardValidatorResult =
  | boolean
  | string[]
  | {
      valid: boolean;
      messages?: string[];
    }
  | Promise<boolean | string[] | { valid: boolean; messages?: string[] }>;

export type WizardStepValidator = (
  step: WizardStep,
  form: AbstractControl | null,
  context?: {
    signal?: AbortSignal;
  }
) => WizardValidatorResult;

export type WizardStepValidators =
  | Record<string, WizardStepValidator>
  | ((
      step: WizardStep,
      form: AbstractControl | null,
      context?: {
        signal?: AbortSignal;
      }
    ) => WizardValidatorResult);

export type WizardValidationMessagesMap = Record<string, string>;

export type WizardValidationMessageResolver = (errorKey: string, errorValue: unknown) => string | null | undefined;

export type WizardCanExitHandler = (params: {
  dirty: boolean;
  stepId: string | null;
  form: AbstractControl | null;
}) => boolean | Promise<boolean> | Observable<boolean>;
