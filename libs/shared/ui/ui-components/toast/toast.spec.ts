import {
    TOAST_POSITIONS,
    TOAST_VARIANTS,
    UiToastProps,
} from './toast.model';

describe('Toast model', () => {
    it('deve expor variants e positions suportadas', () => {
        expect(TOAST_VARIANTS).toEqual(['info', 'success', 'warning', 'error']);
        expect(TOAST_POSITIONS).toEqual(['top-right', 'top-left', 'bottom-right', 'bottom-left']);
    });

    it('deve permitir contrato mínimo de uso', () => {
        const toast: UiToastProps = {
            message: 'Operação concluída',
            variant: 'success',
            duration: 4000,
            position: 'top-right',
        };

        expect(toast.message).toBeTruthy();
        expect(toast.variant).toBe('success');
    });
});