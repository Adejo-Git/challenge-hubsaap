// src\app\lib\ui-components\icon\icon.model.ts

export type UiIconVariant =
    | 'outlined'
    | 'rounded'
    | 'sharp'
    | 'filled';

export interface UiIconProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: UiIconVariant;
}
