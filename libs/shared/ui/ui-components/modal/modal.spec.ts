import { DEFAULT_MODAL_A11Y, MODAL_SIZES } from './modal.model';
import {
    createModalFocusTrap,
    getModalFocusableElements,
    handleModalKeyboardNavigation,
} from './modal-a11y';

describe('Modal contracts and a11y', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('deve expor contrato base de modal', () => {
        expect(MODAL_SIZES).toEqual(['sm', 'md', 'lg']);
        expect(DEFAULT_MODAL_A11Y).toEqual({
            role: 'dialog',
            trapFocus: true,
            closeOnEscape: true,
        });
    });

    it('deve listar elementos focáveis dentro do modal', () => {
        const container = document.createElement('div');
        const closeButton = document.createElement('button');
        const input = document.createElement('input');

        container.append(closeButton, input);
        document.body.appendChild(container);

        const focusables = getModalFocusableElements(container);

        expect(focusables).toEqual([closeButton, input]);
    });

    it('deve ciclar foco com Tab e Shift+Tab', () => {
        const container = document.createElement('div');
        const firstButton = document.createElement('button');
        const lastButton = document.createElement('button');
        container.append(firstButton, lastButton);
        document.body.appendChild(container);

        lastButton.focus();
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
        handleModalKeyboardNavigation(tabEvent, container);
        expect(document.activeElement).toBe(firstButton);

        firstButton.focus();
        const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
        handleModalKeyboardNavigation(shiftTabEvent, container);
        expect(document.activeElement).toBe(lastButton);
    });

    it('deve disparar fechamento no Escape quando habilitado', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        const onEscape = jest.fn();
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
        handleModalKeyboardNavigation(escapeEvent, container, { closeOnEscape: true, onEscape });

        expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it('deve restaurar foco ao desativar focus trap', () => {
        const trigger = document.createElement('button');
        const container = document.createElement('div');
        const modalButton = document.createElement('button');
        container.appendChild(modalButton);
        document.body.append(trigger, container);

        trigger.focus();
        const trap = createModalFocusTrap({
            container,
            closeOnEscape: true,
        });

        trap.activate();
        expect(document.activeElement).toBe(modalButton);

        trap.deactivate();
        expect(document.activeElement).toBe(trigger);
    });
});