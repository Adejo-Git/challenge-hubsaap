import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { WizardFormShellComponent, WizardStepTemplateDirective } from './wizard-form-shell.component';

@NgModule({
  imports: [CommonModule],
  declarations: [WizardFormShellComponent, WizardStepTemplateDirective],
  exports: [WizardFormShellComponent, WizardStepTemplateDirective],
})
export class WizardFormShellModule {}
