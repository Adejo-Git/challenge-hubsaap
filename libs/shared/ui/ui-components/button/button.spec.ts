import {
    BUTTON_SIZES,
    BUTTON_VARIANTS,
    DEFAULT_BUTTON_CONFIG,
} from './button.model';
import {
    ICON_BUTTON_SIZES,
    ICON_BUTTON_VARIANTS,
} from '../icon-button/icon-button.model';

describe('Button model', () => {
    it('deve manter API consistente de variant e size entre button e icon-button', () => {
        expect(BUTTON_VARIANTS).toEqual(ICON_BUTTON_VARIANTS);
        expect(BUTTON_SIZES).toEqual(ICON_BUTTON_SIZES);
    });

    it('deve expor defaults previsíveis para state', () => {
        expect(DEFAULT_BUTTON_CONFIG).toEqual({
            variant: 'primary',
            size: 'md',
            disabled: false,
            loading: false,
            state: 'default',
        });
    });
});