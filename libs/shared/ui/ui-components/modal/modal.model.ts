// src/app/lib/ui-components/modal/modal.model.ts

export type UiModalSize = 'sm' | 'md' | 'lg';

export const MODAL_SIZES: UiModalSize[] = ['sm', 'md', 'lg'];

export interface UiModalA11yConfig {
    role?: 'dialog' | 'alertdialog';
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    trapFocus?: boolean;
    closeOnEscape?: boolean;
    initialFocusSelector?: string;
}

export interface UiModalProps {
    isOpen: boolean;
    size?: UiModalSize;
    title?: string;
    onClose?: () => void;
    children?: unknown;
    closeOnOverlayClick?: boolean;
    a11y?: UiModalA11yConfig;
}

export const DEFAULT_MODAL_A11Y: Required<Pick<UiModalA11yConfig, 'role' | 'trapFocus' | 'closeOnEscape'>> = {
    role: 'dialog',
    trapFocus: true,
    closeOnEscape: true,
};
