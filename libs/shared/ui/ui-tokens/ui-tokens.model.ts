// src/app/lib/ui-tokens/ui-tokens.model.ts

export interface BrandColors {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    accentHover: string;
}

export interface SurfaceColors {
    base: string;
    subtle: string;
    elevated: string;
    alt: string;
    hover: string;
}

export interface TextColors {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
}

export interface BorderColors {
    default: string;
    muted: string;
}

export interface StatusColors {
    success: string;
    warning: string;
    error: string;
    info: string;
}

export interface SemanticColors {
    brand: BrandColors;
    surface: SurfaceColors;
    text: TextColors;
    border: BorderColors;
    status: StatusColors;
}

export interface SpacingScale {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
}

export interface RadiusScale {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    pill: string;
}

export interface FontFamilyScale {
    base: string;
    alt: string;
    mono: string;
}

export interface FontSizeScale {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface LineHeightScale {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
}

export interface FontWeightScale {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
}

export interface TypographyTokens {
    fontFamily: FontFamilyScale;
    fontSize: FontSizeScale;
    lineHeight: LineHeightScale;
    fontWeight: FontWeightScale;
}

export interface ShadowScale {
    sm: string;
    md: string;
    lg: string;
}

export interface ZIndexScale {
    base: number;
    tableHeader: number;
    dropdown: number;
    modal: number;
    sticky: number;
    popover: number;
    toast: number;
    tooltip: number;
}

export interface AccessibilityTokens {
    focusRing: {
        width: string;
        color: string;
        offset: string;
    };
    disabledOpacity: number;
    reducedMotion: boolean;
    motionFast: string;
    motionBase: string;
    contrastMinimum: number;
}

export interface UiTokens {
    colors: SemanticColors;
    spacing: SpacingScale;
    radius: RadiusScale;
    typography: TypographyTokens;
    shadows: ShadowScale;
    zIndex: ZIndexScale;
    accessibility: AccessibilityTokens;
}
