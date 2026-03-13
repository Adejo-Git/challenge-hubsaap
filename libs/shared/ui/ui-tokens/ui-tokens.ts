// src/app/lib/ui-tokens/ui-tokens.ts

import { UiTokens } from './ui-tokens.model';

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const reference = value as object;

  if (seen.has(reference)) {
    return value;
  }

  seen.add(reference);

  if (Array.isArray(value)) {
    value.forEach(item => {
      deepFreeze(item, seen);
    });
  } else {
    Object.values(value as Record<string, unknown>).forEach(item => {
      deepFreeze(item, seen);
    });
  }

  return Object.freeze(value);
}

const UI_TOKENS_LIGHT_RAW = {
  colors: {
    brand: {
      primary: '#00233E',
      primaryHover: '#003C69',
      secondary: '#1e40af',
      accent: '#F7C62E',
      accentHover: '#F7D84A',
    },

    surface: {
      base: '#FFFFFF',
      subtle: '#f8fafc',
      elevated: '#f1f5f9',
      alt: '#F6F8FB',
      hover: '#EAF4FF',
    },

    text: {
      primary: '#00233E',
      secondary: '#4D4D4D',
      muted: '#444444',
      inverse: '#FFFFFF',
    },

    border: {
      default: '#CCCCCC',
      muted: '#E5E7EB',
    },

    status: {
      success: '#28A745',
      warning: '#F7C62E',
      error: '#DC3545',
      info: '#0284C7',
    },
  },

    spacing: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        '5xl': '35px',
    },

    radius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        pill: '9999px',
    },

    typography: {
        fontFamily: {
            base: '"Montserrat", system-ui, sans-serif',
            alt: '"Roboto", system-ui, sans-serif',
            mono: 'JetBrains Mono, monospace',
        },

        fontSize: {
            xs: '13px',
            sm: '14px',
            md: '16px',
            lg: '18px',
            xl: '22px',
            '2xl': '1.5rem',
        },

        lineHeight: {
          xs: '18px',
          sm: '20px',
          md: '24px',
          lg: '28px',
          xl: '32px',
          '2xl': '36px',
        },

        fontWeight: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },

    shadows: {
        sm: '0 2px 8px rgba(0,0,0,0.15)',
        md: '0 3px 8px rgba(0,0,0,0.2)',
        lg: '0 4px 12px rgba(0,0,0,0.2)',
    },

    zIndex: {
        base: 1,
        tableHeader: 5,
        dropdown: 10,
        modal: 10,
        sticky: 20,
        popover: 40,
        toast: 9999,
        tooltip: 9999,
    },

    accessibility: {
        focusRing: {
            width: '3px',
            color: 'rgba(0,35,62,0.35)',
            offset: '0px',
        },
        disabledOpacity: 0.6,
        reducedMotion: false,
        motionFast: '0.12s',
        motionBase: '0.2s',
        contrastMinimum: 4.5,
    },
} as const satisfies UiTokens;

const UI_TOKENS_DARK_RAW: UiTokens = {
  colors: {
    brand: {
      primary: '#7DD3FC',
      primaryHover: '#38BDF8',
      secondary: '#60A5FA',
      accent: '#FACC15',
      accentHover: '#FDE047',
    },

    surface: {
      base: '#020617',
      subtle: '#020617',
      elevated: '#020617',
      alt: '#020617',
      hover: '#020617',
    },

    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      inverse: '#020617',
    },

    border: {
      default: '#334155',
      muted: '#1E293B',
    },

    status: {
      success: '#4ADE80',
      warning: '#FACC15',
      error: '#F87171',
      info: '#38BDF8',
    },
  },

  spacing: {
    ...UI_TOKENS_LIGHT_RAW.spacing,
  },

  radius: {
    ...UI_TOKENS_LIGHT_RAW.radius,
  },

  typography: {
    fontFamily: {
      ...UI_TOKENS_LIGHT_RAW.typography.fontFamily,
    },
    fontSize: {
      ...UI_TOKENS_LIGHT_RAW.typography.fontSize,
    },
    lineHeight: {
      ...UI_TOKENS_LIGHT_RAW.typography.lineHeight,
    },
    fontWeight: {
      ...UI_TOKENS_LIGHT_RAW.typography.fontWeight,
    },
  },

  shadows: {
    ...UI_TOKENS_LIGHT_RAW.shadows,
  },

  zIndex: {
    ...UI_TOKENS_LIGHT_RAW.zIndex,
  },

  accessibility: {
    ...UI_TOKENS_LIGHT_RAW.accessibility,
    focusRing: {
      ...UI_TOKENS_LIGHT_RAW.accessibility.focusRing,
    },
  },
};

export const UI_TOKENS_LIGHT: UiTokens = deepFreeze(UI_TOKENS_LIGHT_RAW);
export const UI_TOKENS_DARK: UiTokens = deepFreeze(UI_TOKENS_DARK_RAW);
export const UI_TOKENS: UiTokens = deepFreeze(UI_TOKENS_LIGHT);