//src\app\lib\ui-tokens\ui-tokens.doc.ts
import { UI_TOKENS } from './ui-tokens';

const toTokenDocs = (prefix: string, values: object) =>
    Object.entries(values as Record<string, string | number>).map(([name, value]) => ({
        name: `${prefix}.${name}`,
        cssVar: `--${prefix.replace(/\./g, '-')}-${name}`,
        value,
    }));

export const UI_TOKENS_DOC = {
    colors: Object.entries(UI_TOKENS.colors).map(([group, values]) => ({
        group,
        tokens: Object.entries(values).map(([name, value]) => ({
            name: `color.${group}.${name}`,
            cssVar: `--color-${group}-${name}`,
            value,
        })),
    })),

    spacing: Object.entries(UI_TOKENS.spacing).map(([key, value]) => ({
        name: `spacing.${key}`,
        cssVar: `--spacing-${key}`,
        value,
    })),

    radius: Object.entries(UI_TOKENS.radius).map(([key, value]) => ({
        name: `radius.${key}`,
        cssVar: `--radius-${key}`,
        value,
    })),

    typography: {
        fontFamily: toTokenDocs('font-family', UI_TOKENS.typography.fontFamily),
        fontSize: toTokenDocs('font-size', UI_TOKENS.typography.fontSize),
        lineHeight: toTokenDocs('line-height', UI_TOKENS.typography.lineHeight),
        fontWeight: toTokenDocs('font-weight', UI_TOKENS.typography.fontWeight),
    },

    shadows: toTokenDocs('shadow', UI_TOKENS.shadows),
    zIndex: toTokenDocs('z-index', UI_TOKENS.zIndex),
    accessibility: {
        focusRing: toTokenDocs('accessibility-focusRing', UI_TOKENS.accessibility.focusRing),
        core: toTokenDocs('accessibility', {
            disabledOpacity: UI_TOKENS.accessibility.disabledOpacity,
            reducedMotion: String(UI_TOKENS.accessibility.reducedMotion),
            motionFast: UI_TOKENS.accessibility.motionFast,
            motionBase: UI_TOKENS.accessibility.motionBase,
            contrastMinimum: UI_TOKENS.accessibility.contrastMinimum,
        }),
    },
};
