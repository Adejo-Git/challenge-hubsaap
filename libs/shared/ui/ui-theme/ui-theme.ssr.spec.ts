/** @jest-environment node */

import { UI_TOKENS_DARK } from '@hub/shared/ui-tokens';
import { applyThemeStrategy, clearThemeStrategy } from './ui-theme.apply';
import { UiThemeService } from './ui-theme.service';

describe('UiThemeService SSR', () => {
    it('should not throw on init when typeof window is undefined', () => {
        expect(typeof window).toBe('undefined');

        const service = new UiThemeService();

        expect(() => service.init()).not.toThrow();
        expect(service.snapshot().key).toBe('light');
    });

    it('should not throw in apply helpers when document is unavailable', () => {
        expect(typeof document).toBe('undefined');

        expect(() => applyThemeStrategy('dark', UI_TOKENS_DARK)).not.toThrow();
        expect(() => clearThemeStrategy()).not.toThrow();
    });
});
