// src/app/lib/ui-theme/ui-theme.model.ts

import { UiTokens } from '@hub/shared/ui-tokens';

export type ThemeKey = 'light' | 'dark';

export type ThemeVariant = 'default' | 'brand';

export type ThemeStrategy = 'data-theme' | 'class';

export interface ThemeState {
    key: ThemeKey;
    variant: ThemeVariant;
    reducedMotion: boolean;
}

export interface UiTheme {
    key: ThemeKey;
    variant: ThemeVariant;
    tokens: UiTokens;
}
