import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { TimelineComponent } from './timeline.component';
import { UiLayoutModule } from '@hub/shared/ui-layout';

@NgModule({
  imports: [CommonModule, UiLayoutModule, ScrollingModule],
  declarations: [TimelineComponent],
  exports: [TimelineComponent],
})
export class TimelineModule {}
