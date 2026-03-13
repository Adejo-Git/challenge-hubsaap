declare module '@hub/shared/ui-theme' {
  export interface UiThemeApplyObservabilityEvent {
    source: 'ui-theme.apply';
    operation: string;
    error: unknown;
  }

  export interface ThemeStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  }

  export function setThemeApplyObservabilityAdapter(adapter: {
    trackError(event: UiThemeApplyObservabilityEvent): void;
  }): void;

  export function setThemeStorageAdapter(adapter: ThemeStorageAdapter): void;

  export class UiThemeService {
    init(): void;
  }
}
