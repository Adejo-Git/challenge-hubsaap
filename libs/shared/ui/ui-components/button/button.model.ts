// src\app\lib\ui-components\button\button.model.ts

import { UiComponentState } from '../ui-component.model';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost';

export type ButtonSize =
    | 'sm'
    | 'md'
    | 'lg';

export const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost'];
export const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

export interface ButtonConfig {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    state?: UiComponentState;
}

export const DEFAULT_BUTTON_CONFIG: Required<Pick<ButtonConfig, 'variant' | 'size' | 'disabled' | 'loading' | 'state'>> = {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    state: 'default',
};
