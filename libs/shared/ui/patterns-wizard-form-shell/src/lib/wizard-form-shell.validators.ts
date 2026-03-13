import { AbstractControl, ValidationErrors } from '@angular/forms';

import {
  WizardValidationMessageResolver,
  WizardValidationMessagesMap,
  WizardStep,
  WizardStepValidator,
  WizardStepValidators,
  WizardValidationState,
  WizardValidatorResult,
} from './wizard-form-shell.model';

const VALIDATION_MESSAGE_MAP: WizardValidationMessagesMap = {
  required: 'Campo obrigatório.',
  minlength: 'Valor menor que o mínimo permitido.',
  maxlength: 'Valor maior que o máximo permitido.',
  min: 'Valor abaixo do mínimo permitido.',
  max: 'Valor acima do máximo permitido.',
  email: 'Formato de e-mail inválido.',
  pattern: 'Formato inválido.',
};

function resolveValidationMessage(
  key: string,
  errorValue: unknown,
  messages?: WizardValidationMessagesMap | WizardValidationMessageResolver
): string {
  if (!messages) {
    return VALIDATION_MESSAGE_MAP[key] ?? key;
  }

  if (typeof messages === 'function') {
    return messages(key, errorValue) ?? VALIDATION_MESSAGE_MAP[key] ?? key;
  }

  return messages[key] ?? VALIDATION_MESSAGE_MAP[key] ?? key;
}

function toMessageList(
  errors: ValidationErrors | null | undefined,
  messages?: WizardValidationMessagesMap | WizardValidationMessageResolver
): string[] {
  if (!errors) {
    return [];
  }

  return Object.entries(errors).map(([key, value]) => resolveValidationMessage(key, value, messages));
}

function normalizeValidatorResult(result: Exclude<Awaited<WizardValidatorResult>, Promise<unknown>>): {
  valid: boolean;
  messages: string[];
} {
  if (typeof result === 'boolean') {
    return {
      valid: result,
      messages: result ? [] : ['Existem erros de validação nesta etapa.'],
    };
  }

  if (Array.isArray(result)) {
    return {
      valid: result.length === 0,
      messages: result,
    };
  }

  return {
    valid: result.valid,
    messages: result.messages ?? (result.valid ? [] : ['Existem erros de validação nesta etapa.']),
  };
}

function resolveStepValidator(step: WizardStep, validators?: WizardStepValidators): WizardStepValidator | null {
  if (!validators) {
    return null;
  }

  if (typeof validators === 'function') {
    return validators;
  }

  return validators[step.id] ?? null;
}

function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError')
  );
}

export function resolveStepControl(form: AbstractControl | null, step: WizardStep): AbstractControl | null {
  if (!form) {
    return null;
  }

  if (!step.controlPath) {
    return form;
  }

  const path = Array.isArray(step.controlPath) ? step.controlPath.join('.') : step.controlPath;
  return form.get(path);
}

export function markStepAsTouched(form: AbstractControl | null, step: WizardStep): void {
  const control = resolveStepControl(form, step);
  control?.markAllAsTouched();
}

export async function validateStep(
  step: WizardStep,
  form: AbstractControl | null,
  validators?: WizardStepValidators,
  messages?: WizardValidationMessagesMap | WizardValidationMessageResolver,
  signal?: AbortSignal
): Promise<{ valid: boolean; messages: string[] }> {
  const stepControl = resolveStepControl(form, step);
  if (stepControl) {
    stepControl.updateValueAndValidity({ onlySelf: false, emitEvent: false });
  }

  const formValid = stepControl ? stepControl.valid : true;
  const formMessages = stepControl ? toMessageList(stepControl.errors, messages) : [];

  const validator = resolveStepValidator(step, validators);
  if (!validator) {
    return {
      valid: formValid,
      messages: formMessages,
    };
  }

  if (signal?.aborted) {
    return {
      valid: formValid,
      messages: formMessages,
    };
  }

  let result: Exclude<Awaited<WizardValidatorResult>, Promise<unknown>>;
  try {
    result = await Promise.resolve(validator(step, form, { signal }));
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) {
      return {
        valid: formValid,
        messages: formMessages,
      };
    }

    throw error;
  }

  const normalized = normalizeValidatorResult(result);

  return {
    valid: formValid && normalized.valid,
    messages: [...new Set([...formMessages, ...normalized.messages])],
  };
}

export function buildValidationState(
  step: WizardStep | null,
  form: AbstractControl | null,
  validResult: { valid: boolean; messages: string[] }
): WizardValidationState {
  const stepControl = step ? resolveStepControl(form, step) : null;

  return {
    stepId: step?.id ?? null,
    valid: validResult.valid,
    invalid: !validResult.valid,
    dirty: Boolean(stepControl?.dirty),
    touched: Boolean(stepControl?.touched),
    errors: {
      stepId: step?.id ?? '',
      hasErrors: validResult.messages.length > 0,
      messages: validResult.messages,
    },
  };
}
