// src/app/lib/ui-tokens/tailwind.preset.ts

type TailwindPresetShape = {
    theme: {
        extend: Record<string, unknown>;
    };
};

export const uiTokensPreset = {
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: 'var(--color-brand-primary)',
                    primaryHover: 'var(--color-brand-primaryHover)',
                    secondary: 'var(--color-brand-secondary)',
                    accent: 'var(--color-brand-accent)',
                    accentHover: 'var(--color-brand-accentHover)',
                },
                surface: {
                    base: 'var(--color-surface-base)',
                    subtle: 'var(--color-surface-subtle)',
                    elevated: 'var(--color-surface-elevated)',
                    alt: 'var(--color-surface-alt)',
                    hover: 'var(--color-surface-hover)',
                },
                text: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-muted)',
                    inverse: 'var(--color-text-inverse)',
                },
                border: {
                    default: 'var(--color-border-default)',
                    muted: 'var(--color-border-muted)',
                },
                status: {
                    success: 'var(--color-status-success)',
                    warning: 'var(--color-status-warning)',
                    error: 'var(--color-status-error)',
                    info: 'var(--color-status-info)',
                },
            },

            spacing: {
                xs: 'var(--spacing-xs)',
                sm: 'var(--spacing-sm)',
                md: 'var(--spacing-md)',
                lg: 'var(--spacing-lg)',
                xl: 'var(--spacing-xl)',
                '2xl': 'var(--spacing-2xl)',
                '3xl': 'var(--spacing-3xl)',
                '4xl': 'var(--spacing-4xl)',
                '5xl': 'var(--spacing-5xl)',
            },

            borderRadius: {
                sm: 'var(--radius-sm)',
                md: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
                xl: 'var(--radius-xl)',
                '2xl': 'var(--radius-2xl)',
                pill: 'var(--radius-pill)',
            },

            fontFamily: {
                base: 'var(--font-family-base)',
                alt: 'var(--font-family-alt)',
                mono: 'var(--font-family-mono)',
            },

            fontSize: {
                xs: 'var(--font-size-xs)',
                sm: 'var(--font-size-sm)',
                md: 'var(--font-size-md)',
                lg: 'var(--font-size-lg)',
                xl: 'var(--font-size-xl)',
                '2xl': 'var(--font-size-2xl)',
            },

            lineHeight: {
                xs: 'var(--line-height-xs)',
                sm: 'var(--line-height-sm)',
                md: 'var(--line-height-md)',
                lg: 'var(--line-height-lg)',
                xl: 'var(--line-height-xl)',
                '2xl': 'var(--line-height-2xl)',
            },

            fontWeight: {
                regular: 'var(--font-weight-regular)',
                medium: 'var(--font-weight-medium)',
                semibold: 'var(--font-weight-semibold)',
                bold: 'var(--font-weight-bold)',
            },

            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
            },

            zIndex: {
                base: 'var(--z-index-base)',
                tableHeader: 'var(--z-index-tableHeader)',
                dropdown: 'var(--z-index-dropdown)',
                sticky: 'var(--z-index-sticky)',
                modal: 'var(--z-index-modal)',
                popover: 'var(--z-index-popover)',
                toast: 'var(--z-index-toast)',
                tooltip: 'var(--z-index-tooltip)',
            },

            opacity: {
                disabled: 'var(--accessibility-disabledOpacity)',
            },
        },
    },
} satisfies TailwindPresetShape;
