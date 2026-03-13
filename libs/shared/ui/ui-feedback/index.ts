// libs/shared/ui/ui-feedback/index.ts

export { UiFeedbackModule } from './ui-feedback.module';

export type { FeedbackState, FeedbackVariant, FeedbackAction, UiMessage } from './ui-feedback.models';
export * from './ui-feedback.mappers';

export { UiLoaderComponent } from './components/ui-loader/ui-loader.component';
export { UiSkeletonComponent } from './components/ui-skeleton/ui-skeleton.component';
export { UiEmptyStateComponent } from './components/ui-empty-state/ui-empty-state.component';
export { UiErrorStateComponent } from './components/ui-error-state/ui-error-state.component';
export { UiDeniedStateComponent } from './components/ui-denied-state/ui-denied-state.component';
export { UiBannerComponent } from './components/ui-banner/ui-banner.component';
export { ErrorPageComponent } from './components/ui-error-page/error-page.component';
