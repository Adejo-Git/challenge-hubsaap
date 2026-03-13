// src/app/lib/ui-components/toast/toast.model.ts

export type UiToastVariant = 'info' | 'success' | 'warning' | 'error';
export type UiToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export const TOAST_VARIANTS: UiToastVariant[] = ['info', 'success', 'warning', 'error'];
export const TOAST_POSITIONS: UiToastPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

export interface UiToastProps {
    message: string;
    title?: string;
    variant?: UiToastVariant;
    duration?: number; // em ms
    position?: UiToastPosition;
    onClose?: () => void;
}
