import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { firstValueFrom, isObservable } from 'rxjs';

import {
  WizardCanExitHandler,
  WizardCancelEvent,
  WizardFinishEvent,
  WizardLayoutOptions,
  WizardValidationMessageResolver,
  WizardValidationMessagesMap,
  WizardNavigationState,
  WizardState,
  WizardStep,
  WizardStepChangeEvent,
  WizardStepValidators,
  WizardValidationState,
} from './wizard-form-shell.model';
import {
  canJumpToStep,
  computeCanBack,
  computeCanFinish,
  computeCanNext,
  getInitialStepIndex,
  getNextEnabledStepIndex,
  getPreviousEnabledStepIndex,
  isStepEnabled,
} from './wizard-form-shell.util';
import { buildValidationState, markStepAsTouched, validateStep } from './wizard-form-shell.validators';

@Directive({
  selector: 'ng-template[wizardStep]',
  standalone: false,
})
export class WizardStepTemplateDirective {
  @Input('wizardStep') stepId = '';

  constructor(public readonly templateRef: TemplateRef<unknown>) {}
}

@Component({
  selector: 'hub-wizard-form-shell',
  standalone: false,
  templateUrl: './wizard-form-shell.component.html',
  styleUrls: ['./wizard-form-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WizardFormShellComponent implements OnChanges {
  @Input() steps: WizardStep[] = [];
  @Input() form: AbstractControl | null = null;
  @Input() stepValidators?: WizardStepValidators;
  @Input() canExit?: WizardCanExitHandler;
  @Input() initialStepId?: string;
  @Input() layoutOptions: WizardLayoutOptions = {};
  @Input() isBusy = false;
  @Input() errorMessage: string | null = null;
  @Input() validationMessages?: WizardValidationMessagesMap | WizardValidationMessageResolver;

  @Output() readonly stepChange = new EventEmitter<WizardStepChangeEvent>();
  @Output() readonly finish = new EventEmitter<WizardFinishEvent>();
  @Output() readonly cancel = new EventEmitter<WizardCancelEvent>();
  @Output() readonly validationState = new EventEmitter<WizardValidationState>();
  @Output() readonly navigationState = new EventEmitter<WizardNavigationState>();

  @ContentChildren(WizardStepTemplateDirective)
  stepTemplates!: QueryList<WizardStepTemplateDirective>;

  currentStepIndex = -1;
  currentValidation: WizardValidationState = {
    stepId: null,
    valid: true,
    invalid: false,
    dirty: false,
    touched: false,
    errors: {
      stepId: '',
      hasErrors: false,
      messages: [],
    },
  };
  navigationSnapshot: WizardNavigationState = {
    activeStepId: null,
    canBack: false,
    canNext: false,
    canFinish: false,
    isBusy: false,
    isBlocked: false,
  };
  private validationRunId = 0;
  private validationAbortController: AbortController | null = null;
  private pendingExitDecision: Promise<boolean> | null = null;
  private cancelInFlight = false;
  private completedStepIds = new Set<string>();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly elementRef?: ElementRef<HTMLElement>
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['steps'] || changes['initialStepId']) {
      this.currentStepIndex = getInitialStepIndex(this.steps, this.initialStepId);
      this.completedStepIds = new Set<string>();
    }

    if (changes['isBusy']) {
      this.emitNavigationState();
    }

    this.recomputeValidationState();
    this.emitNavigationState();
  }

  get activeStep(): WizardStep | null {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return null;
    }

    return this.steps[this.currentStepIndex] ?? null;
  }

  get currentTemplate(): TemplateRef<unknown> | null {
    const step = this.activeStep;
    if (!step || !this.stepTemplates) {
      return null;
    }

    return this.stepTemplates.find((item) => item.stepId === step.id)?.templateRef ?? null;
  }

  get stepperOrientationClass(): string {
    return this.layoutOptions.orientation === 'vertical'
      ? 'wizard-form-shell--vertical'
      : 'wizard-form-shell--horizontal';
  }

  get stepperPositionClass(): string {
    return this.layoutOptions.stepperPosition === 'left'
      ? 'wizard-form-shell--stepper-left'
      : 'wizard-form-shell--stepper-top';
  }

  getState(): WizardState {
    return {
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      completedStepIds: Array.from(this.completedStepIds),
      validation: this.currentValidation,
      navigation: this.computeNavigationState(),
    };
  }

  isDirty(): boolean {
    return Boolean(this.form?.dirty);
  }

  getActiveStepId(): string | null {
    return this.activeStep?.id ?? null;
  }

  async onNext(): Promise<void> {
    if (this.isBusy) {
      return;
    }

    const current = this.activeStep;
    if (!current) {
      return;
    }

    const valid = await this.validateCurrentStep(true);
    if (!valid) {
      return;
    }

    const nextIndex = getNextEnabledStepIndex(this.steps, this.currentStepIndex);
    if (nextIndex < 0) {
      return;
    }

    this.changeStep(nextIndex, 'next');
  }

  onBack(): void {
    if (this.isBusy) {
      return;
    }

    const previousIndex = getPreviousEnabledStepIndex(this.steps, this.currentStepIndex);
    if (previousIndex < 0) {
      return;
    }

    this.changeStep(previousIndex, 'back');
  }

  async onJump(stepId: string): Promise<void> {
    if (this.isBusy) {
      return;
    }

    const targetIndex = this.steps.findIndex((step) => step.id === stepId);
    if (targetIndex < 0 || !canJumpToStep(this.steps, targetIndex)) {
      return;
    }

    if (targetIndex > this.currentStepIndex) {
      const valid = await this.validateCurrentStep(true);
      if (!valid) {
        return;
      }
    }

    this.changeStep(targetIndex, 'jump');
  }

  async onFinish(): Promise<void> {
    if (this.isBusy) {
      return;
    }

    const valid = await this.validateCurrentStep(true);
    if (!valid) {
      return;
    }

    const payload: WizardFinishEvent = {
      stepId: this.activeStep?.id ?? null,
      formSnapshot: this.form?.getRawValue ? this.form.getRawValue() : this.form?.value,
      state: this.getState(),
    };

    this.finish.emit(payload);
  }

  async onCancel(reason = 'user-cancel'): Promise<void> {
    if (this.cancelInFlight) {
      return;
    }

    this.cancelInFlight = true;
    const canExit = await this.requestExit();
    try {
      if (!canExit) {
        return;
      }

      this.cancel.emit({
        reason,
        dirty: this.isDirty(),
        stepId: this.activeStep?.id ?? null,
      });
    } finally {
      this.cancelInFlight = false;
    }
  }

  isStepActive(step: WizardStep): boolean {
    return this.activeStep?.id === step.id;
  }

  isStepClickable(step: WizardStep, index: number): boolean {
    return !this.isBusy && isStepEnabled(step) && index !== this.currentStepIndex;
  }

  isStepAriaDisabled(step: WizardStep, index: number): boolean {
    return !this.isStepClickable(step, index);
  }

  isStepCompleted(step: WizardStep): boolean {
    return this.completedStepIds.has(step.id);
  }

  getStepDisabledLabel(step: WizardStep, index: number): string | null {
    if (this.isStepClickable(step, index)) {
      return null;
    }

    return 'Etapa indisponível no momento';
  }

  getStepTabIndex(step: WizardStep, index: number): number {
    if (this.isStepActive(step)) {
      return 0;
    }

    return this.isStepClickable(step, index) ? 0 : -1;
  }

  onStepKeydown(event: KeyboardEvent, index: number): void {
    if (this.isBusy) {
      return;
    }

    let targetIndex = -1;
    let activateIndex = -1;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = getNextEnabledStepIndex(this.steps, index);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = getPreviousEnabledStepIndex(this.steps, index);
        break;
      case 'Home':
        targetIndex = getInitialStepIndex(this.steps);
        break;
      case 'End':
        for (let cursor = this.steps.length - 1; cursor >= 0; cursor -= 1) {
          if (isStepEnabled(this.steps[cursor])) {
            targetIndex = cursor;
            break;
          }
        }
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        activateIndex = index;
        break;
      default:
        return;
    }

    if (activateIndex >= 0) {
      if (this.isStepClickable(this.steps[activateIndex], activateIndex)) {
        event.preventDefault();
        void this.onJump(this.steps[activateIndex].id);
      }
      return;
    }

    if (targetIndex < 0 || targetIndex === index) {
      return;
    }

    event.preventDefault();
    this.focusStepButton(targetIndex);
  }

  private focusStepButton(index: number): void {
    const step = this.steps[index];
    if (!step || !this.elementRef?.nativeElement) {
      return;
    }

    const stepButton = this.elementRef.nativeElement.querySelector<HTMLButtonElement>(`#wizard-step-tab-${step.id}`);
    stepButton?.focus();
  }

  private async validateCurrentStep(markTouched: boolean): Promise<boolean> {
    const step = this.activeStep;
    if (!step) {
      return true;
    }

    if (markTouched) {
      markStepAsTouched(this.form, step);
    }

    this.validationAbortController?.abort();
    this.validationAbortController = new AbortController();

    const currentRunId = ++this.validationRunId;
    const validation = await validateStep(
      step,
      this.form,
      this.stepValidators,
      this.validationMessages,
      this.validationAbortController.signal
    );
    if (currentRunId !== this.validationRunId) {
      return validation.valid;
    }

    if (markTouched && validation.valid) {
      this.completedStepIds.add(step.id);
    }

    this.currentValidation = buildValidationState(step, this.form, validation);
    this.validationState.emit(this.currentValidation);
    this.emitNavigationState();
    this.cdr.markForCheck();

    return validation.valid;
  }

  private recomputeValidationState(): void {
    const step = this.activeStep;
    if (!step) {
      return;
    }

    void this.validateCurrentStep(false);
  }

  private async requestExit(): Promise<boolean> {
    if (this.pendingExitDecision) {
      return this.pendingExitDecision;
    }

    const dirty = this.isDirty();
    if (!dirty) {
      return true;
    }

    if (!this.canExit) {
      return false;
    }

    const response = this.canExit({
        dirty,
        stepId: this.activeStep?.id ?? null,
        form: this.form,
      });

    const exitPromise = isObservable(response) ? firstValueFrom(response) : Promise.resolve(response);
    this.pendingExitDecision = exitPromise;

    try {
      return await exitPromise;
    } finally {
      if (this.pendingExitDecision === exitPromise) {
        this.pendingExitDecision = null;
      }
    }
  }

  private changeStep(targetIndex: number, reason: 'next' | 'back' | 'jump'): void {
    const fromStepId = this.activeStep?.id ?? null;
    this.currentStepIndex = targetIndex;
    const toStepId = this.activeStep?.id ?? null;

    this.stepChange.emit({
      fromStepId,
      toStepId,
      reason,
    });

    this.recomputeValidationState();
    this.emitNavigationState();
  }

  private computeNavigationState(): WizardNavigationState {
    const stepValid = this.currentValidation.valid;

    return {
      activeStepId: this.activeStep?.id ?? null,
      canBack: computeCanBack(this.steps, this.currentStepIndex, this.isBusy),
      canNext: computeCanNext(this.steps, this.currentStepIndex, this.isBusy, stepValid),
      canFinish: computeCanFinish(this.steps, this.currentStepIndex, this.isBusy, stepValid),
      isBusy: this.isBusy,
      isBlocked: !stepValid,
    };
  }

  private emitNavigationState(): void {
    this.navigationSnapshot = this.computeNavigationState();
    this.navigationState.emit(this.navigationSnapshot);
    this.cdr.markForCheck();
  }
}
