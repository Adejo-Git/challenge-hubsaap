// src/app/lib/ui-tokens/ui-tokens.spec.ts

import { uiTokensPreset } from './tailwind.preset';
import { generateCssVars } from './ui-tokens.cssvars';
import { UI_TOKENS, UI_TOKENS_DARK } from './ui-tokens';

function hexToRgb(hex: string): [number, number, number] {
    const sanitized = hex.replace('#', '');
    const normalized = sanitized.length === 3
        ? sanitized.split('').map(part => `${part}${part}`).join('')
        : sanitized;

    const parsed = Number.parseInt(normalized, 16);

    return [
        (parsed >> 16) & 255,
        (parsed >> 8) & 255,
        parsed & 255,
    ];
}

function srgbToLinear(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.03928
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex);
    return (0.2126 * srgbToLinear(r)) + (0.7152 * srgbToLinear(g)) + (0.0722 * srgbToLinear(b));
}

function contrastRatio(foreground: string, background: string): number {
    const l1 = luminance(foreground);
    const l2 = luminance(background);
    const light = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
}

describe('UI Tokens contract', () => {
    it('should expose required semantic color groups and keys', () => {
        const groups = ['brand', 'surface', 'text', 'border', 'status'] as const;
        const expectedKeys = {
            brand: ['primary', 'primaryHover', 'secondary', 'accent', 'accentHover'],
            surface: ['base', 'subtle', 'elevated', 'alt', 'hover'],
            text: ['primary', 'secondary', 'muted', 'inverse'],
            border: ['default', 'muted'],
            status: ['success', 'warning', 'error', 'info'],
        } as const;

        groups.forEach(group => {
            expect(UI_TOKENS.colors[group]).toBeDefined();
            expect(Object.keys(UI_TOKENS.colors[group])).toEqual(expectedKeys[group]);
        });
    });

    it('should expose required spacing/radius/shadow scales', () => {
        const spacingKeys = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'] as const;
        const radiusKeys = ['sm', 'md', 'lg', 'xl', '2xl', 'pill'] as const;
        const shadowKeys = ['sm', 'md', 'lg'] as const;

        spacingKeys.forEach(key => {
            expect(UI_TOKENS.spacing[key]).toBeDefined();
        });

        radiusKeys.forEach(key => {
            expect(UI_TOKENS.radius[key]).toBeDefined();
        });

        shadowKeys.forEach(key => {
            expect(UI_TOKENS.shadows[key]).toBeDefined();
        });
    });

    it('should expose typography tokens with line-height contract', () => {
        expect(UI_TOKENS.typography.fontFamily.base).toBeDefined();
        expect(UI_TOKENS.typography.fontSize.md).toBeDefined();
        expect(UI_TOKENS.typography.lineHeight.md).toBeDefined();
        expect(UI_TOKENS.typography.fontWeight.regular).toBeDefined();
    });

    it('should expose accessibility tokens', () => {
        expect(UI_TOKENS.accessibility.focusRing).toBeDefined();
        expect(UI_TOKENS.accessibility.disabledOpacity).toBeGreaterThan(0);
        expect(UI_TOKENS.accessibility.contrastMinimum).toBeGreaterThanOrEqual(4.5);
    });

    it('should keep token contract deeply immutable at runtime', () => {
        expect(Object.isFrozen(UI_TOKENS)).toBe(true);
        expect(Object.isFrozen(UI_TOKENS.spacing)).toBe(true);
        expect(Object.isFrozen(UI_TOKENS.typography.fontSize)).toBe(true);
        expect(Object.isFrozen(UI_TOKENS.accessibility.focusRing)).toBe(true);
        expect(Object.isFrozen(UI_TOKENS_DARK)).toBe(true);
        expect(Object.isFrozen(UI_TOKENS_DARK.radius)).toBe(true);

        expect(() => {
            ((UI_TOKENS as unknown) as Record<string, unknown>).spacing = { md: '999px' };
        }).toThrow();

        expect(() => {
            ((UI_TOKENS.spacing as unknown) as Record<string, unknown>).md = '999px';
        }).toThrow();
    });

    it('should not share structural object references between light and dark tokens', () => {
        expect(UI_TOKENS_DARK.colors).not.toBe(UI_TOKENS.colors);
        expect(UI_TOKENS_DARK.spacing).not.toBe(UI_TOKENS.spacing);
        expect(UI_TOKENS_DARK.radius).not.toBe(UI_TOKENS.radius);
        expect(UI_TOKENS_DARK.typography).not.toBe(UI_TOKENS.typography);
        expect(UI_TOKENS_DARK.typography.fontFamily).not.toBe(UI_TOKENS.typography.fontFamily);
        expect(UI_TOKENS_DARK.typography.fontSize).not.toBe(UI_TOKENS.typography.fontSize);
        expect(UI_TOKENS_DARK.typography.lineHeight).not.toBe(UI_TOKENS.typography.lineHeight);
        expect(UI_TOKENS_DARK.typography.fontWeight).not.toBe(UI_TOKENS.typography.fontWeight);
        expect(UI_TOKENS_DARK.shadows).not.toBe(UI_TOKENS.shadows);
        expect(UI_TOKENS_DARK.zIndex).not.toBe(UI_TOKENS.zIndex);
        expect(UI_TOKENS_DARK.accessibility).not.toBe(UI_TOKENS.accessibility);
        expect(UI_TOKENS_DARK.accessibility.focusRing).not.toBe(UI_TOKENS.accessibility.focusRing);
    });

    it('should generate css variables for required categories', () => {
        const css = generateCssVars(UI_TOKENS);

        expect(css).toContain('--color-surface-base');
        expect(css).toContain('--spacing-md');
        expect(css).toContain('--radius-md');
        expect(css).toContain('--font-size-md');
        expect(css).toContain('--line-height-md');
        expect(css).toContain('--shadow-md');
        expect(css).toContain('--z-index-modal');
        expect(css).toContain('--accessibility-focusRing-color');
    });

    it('should ignore array-like unexpected values when generating css vars', () => {
        const tokensWithArray = {
            ...UI_TOKENS,
            accessibility: {
                ...UI_TOKENS.accessibility,
                unsupported: ['a', 'b'],
            },
        } as unknown as typeof UI_TOKENS;

        const css = generateCssVars(tokensWithArray);

        expect(css).not.toContain('--accessibility-unsupported:');
        expect(css).not.toContain('--accessibility-unsupported-0:');
    });

    it('should ignore null/undefined/symbol/function and avoid unsafe serialization in css vars', () => {
        const nullPrototypeObject = Object.create(null) as Record<string, unknown>;
        nullPrototypeObject.valid = '12px';

        const tokensWithUnexpectedValues = {
            ...UI_TOKENS,
            accessibility: {
                ...UI_TOKENS.accessibility,
                nullable: null,
                maybeUndefined: undefined,
                symbolic: Symbol('x'),
                callable: () => 'token',
                nullPrototypeObject,
            },
        } as unknown as typeof UI_TOKENS;

        const css = generateCssVars(tokensWithUnexpectedValues);

        expect(css).not.toContain('--accessibility-nullable:');
        expect(css).not.toContain('--accessibility-maybeUndefined:');
        expect(css).not.toContain('--accessibility-symbolic:');
        expect(css).not.toContain('--accessibility-callable:');
        expect(css).toContain('--accessibility-nullPrototypeObject-valid: 12px;');
        expect(css).not.toContain('[object Object]');
        expect(css).not.toContain(': null;');
        expect(css).not.toContain(': undefined;');
    });

    it('should expose tailwind mapping for semantic tokens', () => {
        expect(uiTokensPreset.theme?.extend?.colors?.surface?.base).toBe('var(--color-surface-base)');
        expect(uiTokensPreset.theme?.extend?.spacing?.md).toBe('var(--spacing-md)');
        expect(uiTokensPreset.theme?.extend?.fontSize?.md).toBe('var(--font-size-md)');
        expect(uiTokensPreset.theme?.extend?.lineHeight?.md).toBe('var(--line-height-md)');
        expect(uiTokensPreset.theme?.extend?.zIndex?.modal).toBe('var(--z-index-modal)');
    });

    it('should use canonical tailwind theme extension keys', () => {
        const extend = uiTokensPreset.theme.extend as Record<string, unknown>;

        expect(extend).toHaveProperty('colors');
        expect(extend).toHaveProperty('spacing');
        expect(extend).toHaveProperty('borderRadius');
        expect(extend).toHaveProperty('fontFamily');
        expect(extend).toHaveProperty('fontSize');
        expect(extend).toHaveProperty('lineHeight');
        expect(extend).toHaveProperty('fontWeight');
        expect(extend).toHaveProperty('boxShadow');
        expect(extend).toHaveProperty('zIndex');
        expect(extend).toHaveProperty('opacity');
        expect(extend).not.toHaveProperty('borderRadii');
    });

    it('should have all css vars referenced by tailwind preset available in generated css vars', () => {
        const css = generateCssVars(UI_TOKENS);
        const generatedVarNames = new Set(css.match(/--[A-Za-z0-9-]+(?=:)/g) ?? []);
        const presetVarNames = new Set(JSON.stringify(uiTokensPreset).match(/--[A-Za-z0-9-]+/g) ?? []);

        expect(presetVarNames.size).toBeGreaterThan(0);
        presetVarNames.forEach(varName => {
            expect(generatedVarNames.has(varName)).toBe(true);
        });
    });

    it('should meet minimum contrast for primary text on base surface (light and dark)', () => {
        const lightContrast = contrastRatio(UI_TOKENS.colors.text.primary, UI_TOKENS.colors.surface.base);
        const darkContrast = contrastRatio(UI_TOKENS_DARK.colors.text.primary, UI_TOKENS_DARK.colors.surface.base);

        expect(lightContrast).toBeGreaterThanOrEqual(UI_TOKENS.accessibility.contrastMinimum);
        expect(darkContrast).toBeGreaterThanOrEqual(UI_TOKENS_DARK.accessibility.contrastMinimum);
    });
});
