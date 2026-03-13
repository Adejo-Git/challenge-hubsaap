import { AbstractControl } from '@angular/forms';
import { from, Observable, isObservable, of } from 'rxjs';

import { WizardCanExitHandler } from './wizard-form-shell.model';

export interface WizardDirtyAware {
  isDirty(): boolean;
  getActiveStepId?(): string | null;
  getFormSnapshot?(): unknown;
  form?: AbstractControl | null;
  canExit?: WizardCanExitHandler;
}

export function canDeactivateWizard(component: WizardDirtyAware): Observable<boolean> {
  const dirty = component.isDirty();

  if (!dirty) {
    return of(true);
  }

  if (!component.canExit) {
    return of(false);
  }

  const response = component.canExit({
    dirty,
    stepId: component.getActiveStepId?.() ?? null,
    form: component.form ?? null,
  });

  if (isObservable(response)) {
    return response;
  }

  return from(Promise.resolve(response));
}
