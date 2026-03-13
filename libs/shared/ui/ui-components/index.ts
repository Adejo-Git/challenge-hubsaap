// src\app\lib\ui-components\index.ts

export type { UiComponentState } from './ui-component.model';

export type { UiBadgeVariant, UiBadgeSize } from './badge/badge.model';

export type { ButtonVariant, ButtonSize, ButtonConfig } from './button/button.model';
export { BUTTON_VARIANTS, BUTTON_SIZES, DEFAULT_BUTTON_CONFIG } from './button/button.model';

export type { UiCardVariant, UiCardPadding } from './card/card.model';

export type { UiDividerOrientation, UiDividerSpacing } from './divider/divider.model';

export type { UiIconVariant, UiIconProps } from './icon/icon.model';

export type {
	UiIconButtonVariant,
	UiIconButtonSize,
	UiIconButtonProps,
} from './icon-button/icon-button.model';
export { ICON_BUTTON_VARIANTS, ICON_BUTTON_SIZES } from './icon-button/icon-button.model';

export type { UiLinkVariant, UiLinkSize } from './link/link.model';

export type { UiTagVariant, UiTagSize, UiTagState } from './tag/tag.model';

export type { UiAlertVariant, UiAlertSize, UiAlertState } from './alert/alert.model';

export type { UiWidgetVariant } from './widget/widget.model';

export type { UiToastVariant, UiToastPosition, UiToastProps } from './toast/toast.model';
export { TOAST_VARIANTS, TOAST_POSITIONS } from './toast/toast.model';

export type {
	UiModalSize,
	UiModalA11yConfig,
	UiModalProps,
} from './modal/modal.model';
export { MODAL_SIZES, DEFAULT_MODAL_A11Y } from './modal/modal.model';
export {
	createModalFocusTrap,
	getModalFocusableElements,
	handleModalKeyboardNavigation,
} from './modal/modal-a11y';