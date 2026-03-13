// src\app\lib\ui-components\icon-button\icon-button.model.ts

import { UiComponentState } from '../ui-component.model';

export type UiIconButtonVariant =
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost';

export type UiIconButtonSize = 'sm' | 'md' | 'lg';

export const ICON_BUTTON_VARIANTS: UiIconButtonVariant[] = ['primary', 'secondary', 'danger', 'ghost'];
export const ICON_BUTTON_SIZES: UiIconButtonSize[] = ['sm', 'md', 'lg'];

export interface UiIconButtonProps {
    icon: string;
    variant?: UiIconButtonVariant;
    size?: UiIconButtonSize;
    disabled?: boolean;
    loading?: boolean;
    state?: UiComponentState;
}
