// src/app/lib/ui-components/modal/index.ts

export type {
	UiModalSize,
	UiModalA11yConfig,
	UiModalProps,
} from './modal.model';
export { MODAL_SIZES, DEFAULT_MODAL_A11Y } from './modal.model';
export {
	createModalFocusTrap,
	getModalFocusableElements,
	handleModalKeyboardNavigation,
} from './modal-a11y';
