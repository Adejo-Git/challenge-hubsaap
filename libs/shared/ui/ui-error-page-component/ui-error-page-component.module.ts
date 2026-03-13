import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiIconsAssetsModule } from '../ui-icons-assets';
import { ErrorPageComponent } from './error-page.component';

@NgModule({
  imports: [CommonModule, UiIconsAssetsModule, ErrorPageComponent],
  exports: [ErrorPageComponent],
})
export class UiErrorPageComponentModule { }
