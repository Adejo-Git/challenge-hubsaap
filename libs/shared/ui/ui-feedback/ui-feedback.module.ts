// libs/shared/ui/ui-feedback/ui-feedback.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiLoaderComponent } from './components/ui-loader/ui-loader.component';
import { UiSkeletonComponent } from './components/ui-skeleton/ui-skeleton.component';
import { UiEmptyStateComponent } from './components/ui-empty-state/ui-empty-state.component';
import { UiErrorStateComponent } from './components/ui-error-state/ui-error-state.component';
import { UiDeniedStateComponent } from './components/ui-denied-state/ui-denied-state.component';
import { UiBannerComponent } from './components/ui-banner/ui-banner.component';

@NgModule({
    imports: [CommonModule],
    declarations: [
        UiLoaderComponent,
        UiSkeletonComponent,
        UiEmptyStateComponent,
        UiErrorStateComponent,
        UiDeniedStateComponent,
        UiBannerComponent,
    ],
    exports: [
        UiLoaderComponent,
        UiSkeletonComponent,
        UiEmptyStateComponent,
        UiErrorStateComponent,
        UiDeniedStateComponent,
        UiBannerComponent,
    ],
})
export class UiFeedbackModule { }
