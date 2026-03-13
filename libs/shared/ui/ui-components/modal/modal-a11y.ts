const MODAL_FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export const getModalFocusableElements = (container: HTMLElement): HTMLElement[] => {
    return Array.from(container.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
};

export const handleModalKeyboardNavigation = (
    event: KeyboardEvent,
    container: HTMLElement,
    options?: {
        closeOnEscape?: boolean;
        onEscape?: () => void;
    },
): void => {
    if (event.key === 'Escape' && options?.closeOnEscape !== false) {
        event.preventDefault();
        options.onEscape?.();
        return;
    }

    if (event.key !== 'Tab') {
        return;
    }

    const focusables = getModalFocusableElements(container);
    if (!focusables.length) {
        event.preventDefault();
        container.focus();
        return;
    }

    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
    }

    if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
    }
};

export const createModalFocusTrap = (config: {
    container: HTMLElement;
    closeOnEscape?: boolean;
    onEscape?: () => void;
    initialFocusSelector?: string;
    restoreFocus?: boolean;
}) => {
    let previousFocusedElement: HTMLElement | null = null;

    const onKeyDown = (event: KeyboardEvent): void => {
        handleModalKeyboardNavigation(event, config.container, {
            closeOnEscape: config.closeOnEscape,
            onEscape: config.onEscape,
        });
    };

    return {
        activate: (): void => {
            previousFocusedElement = document.activeElement as HTMLElement | null;
            document.addEventListener('keydown', onKeyDown);

            const initialFocusElement = config.initialFocusSelector
                ? config.container.querySelector<HTMLElement>(config.initialFocusSelector)
                : null;
            const fallbackFocusElement = getModalFocusableElements(config.container)[0] ?? config.container;

            if (!config.container.hasAttribute('tabindex')) {
                config.container.setAttribute('tabindex', '-1');
            }

            (initialFocusElement ?? fallbackFocusElement).focus();
        },
        deactivate: (): void => {
            document.removeEventListener('keydown', onKeyDown);

            if (config.restoreFocus !== false) {
                previousFocusedElement?.focus();
            }
        },
    };
};