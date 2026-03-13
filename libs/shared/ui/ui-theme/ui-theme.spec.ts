// src/app/lib/ui-theme/ui-theme.spec.ts

import { UI_TOKENS_DARK, UI_TOKENS_LIGHT } from '@hub/shared/ui-tokens';
import {
    applyThemeStrategy,
    clearThemeStrategy,
    resetThemeApplyObservabilityAdapter,
    setThemeApplyObservabilityAdapter,
} from './ui-theme.apply';
import { UiThemeService } from './ui-theme.service';
import {
    loadTheme,
    resetThemeStorageAdapter,
    saveTheme,
    setThemeStorageAdapter,
    THEME_STORAGE_KEY,
} from './ui-theme.storage';

describe('UiThemeService', () => {
    let service: UiThemeService;
    let matchMediaMock: jest.Mock;

    const setMatchMedia = (config?: { dark?: boolean; reducedMotion?: boolean }) => {
        const dark = config?.dark ?? false;
        const reducedMotion = config?.reducedMotion ?? false;

        matchMediaMock.mockImplementation((query: string) => {
            const matches = query.includes('prefers-color-scheme: dark')
                ? dark
                : query.includes('prefers-reduced-motion: reduce')
                    ? reducedMotion
                    : false;

            return {
                matches,
                media: query,
                onchange: null,
                addListener: jest.fn(),
                removeListener: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                dispatchEvent: jest.fn(),
            };
        });
    };

    beforeEach(() => {
        resetThemeApplyObservabilityAdapter();
        resetThemeStorageAdapter();
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.cssText = '';

        matchMediaMock = jest.fn();
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaMock,
        });

        setMatchMedia({ dark: false, reducedMotion: false });
        service = new UiThemeService();
    });

    it('should apply initial theme on init and set data-theme', () => {
        service.init();
        expect(service.snapshot().key).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should honor saved preference before system preference', () => {
        localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        setMatchMedia({ dark: false, reducedMotion: false });

        service.init();

        expect(service.snapshot().key).toBe('dark');
        expect(document.documentElement.style.getPropertyValue('--color-surface-base')).toBe(UI_TOKENS_DARK.colors.surface.base);
    });

    it('should support system preference when there is no saved value', () => {
        setMatchMedia({ dark: true, reducedMotion: false });

        service.init();

        expect(service.snapshot().key).toBe('dark');
    });

    it('should toggle theme and persist preference', () => {
        service.init();
        const initial = service.snapshot().key;

        service.toggleTheme();

        expect(service.snapshot().key).not.toBe(initial);
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(service.snapshot().key);
    });

    it('should notify consumers through watchTheme', () => {
        const emissions: string[] = [];
        const subscription = service.watchTheme().subscribe(state => {
            emissions.push(state.key);
        });

        service.init();
        service.toggleTheme();

        expect(emissions.length).toBeGreaterThanOrEqual(3);
        subscription.unsubscribe();
    });

    it('should apply reduced motion overrides when user preference is reduce', () => {
        setMatchMedia({ dark: false, reducedMotion: true });

        service.init();

        expect(service.snapshot().reducedMotion).toBe(true);
        expect(document.documentElement.style.getPropertyValue('--accessibility-motionFast')).toBe('0ms');
        expect(document.documentElement.style.getPropertyValue('--accessibility-motionBase')).toBe('0ms');
    });

    it('should keep motion tokens when reduced motion is not enabled', () => {
        setMatchMedia({ dark: false, reducedMotion: false });

        service.init();

        expect(service.snapshot().reducedMotion).toBe(false);
        expect(document.documentElement.style.getPropertyValue('--accessibility-motionFast')).toBe(UI_TOKENS_LIGHT.accessibility.motionFast);
        expect(document.documentElement.style.getPropertyValue('--accessibility-motionBase')).toBe(UI_TOKENS_LIGHT.accessibility.motionBase);
    });

    it('should expose active tokens via utility getter', () => {
        service.init();

        expect(service.getThemeTokens().colors.surface.base).toBe(UI_TOKENS_LIGHT.colors.surface.base);
        expect(service.getThemeTokens('dark').colors.surface.base).toBe(UI_TOKENS_DARK.colors.surface.base);
    });

});

describe('ui-theme.apply (SSR + idempotência)', () => {
    it('should clear applied css variables and attribute when requested', () => {
        applyThemeStrategy('light', UI_TOKENS_LIGHT);

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(document.documentElement.style.getPropertyValue('--color-surface-base')).toBe(UI_TOKENS_LIGHT.colors.surface.base);

        clearThemeStrategy();

        expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        expect(document.documentElement.style.getPropertyValue('--color-surface-base')).toBe('');
    });

    it('should be idempotent when applying theme repeatedly', () => {
        applyThemeStrategy('light', UI_TOKENS_LIGHT);
        applyThemeStrategy('dark', UI_TOKENS_DARK);
        applyThemeStrategy('dark', UI_TOKENS_DARK);

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(document.documentElement.style.getPropertyValue('--color-surface-base')).toBe(UI_TOKENS_DARK.colors.surface.base);
    });

    it('should apply accessibility contrast token as css variable', () => {
        applyThemeStrategy('light', UI_TOKENS_LIGHT);

        expect(document.documentElement.style.getPropertyValue('--accessibility-contrastMinimum')).toBe(
            String(UI_TOKENS_LIGHT.accessibility.contrastMinimum)
        );
    });

    it('should report apply errors through observability adapter', () => {
        const trackError = jest.fn();
        const invalidTokens = {
            ...UI_TOKENS_LIGHT,
            colors: null,
        } as unknown as typeof UI_TOKENS_LIGHT;

        setThemeApplyObservabilityAdapter({ trackError });

        applyThemeStrategy('light', invalidTokens);

        expect(trackError).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'ui-theme.apply',
                operation: 'applyThemeStrategy',
            })
        );
    });
});

describe('ui-tokens (imutabilidade estrutural mínima)', () => {
    it('should not share nested object references between light and dark tokens', () => {
        expect(UI_TOKENS_DARK.typography).not.toBe(UI_TOKENS_LIGHT.typography);
        expect(UI_TOKENS_DARK.typography.fontFamily).not.toBe(UI_TOKENS_LIGHT.typography.fontFamily);
        expect(UI_TOKENS_DARK.accessibility).not.toBe(UI_TOKENS_LIGHT.accessibility);
        expect(UI_TOKENS_DARK.accessibility.focusRing).not.toBe(UI_TOKENS_LIGHT.accessibility.focusRing);
    });
});

describe('ui-theme.storage (facade)', () => {
    it('should allow custom storage adapter for save/load operations', () => {
        const backingStore = new Map<string, string>();

        setThemeStorageAdapter({
            getItem: (key) => backingStore.get(key) ?? null,
            setItem: (key, value) => {
                backingStore.set(key, value);
            },
        });

        saveTheme('dark');

        expect(backingStore.get(THEME_STORAGE_KEY)).toBe('dark');
        expect(loadTheme()).toBe('dark');
    });
});
