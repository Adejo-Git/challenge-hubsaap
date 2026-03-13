// src/app/lib/ui-tokens/ui-tokens.cssvars.ts

import { UiTokens } from "./ui-tokens.model";

type SerializableTokenValue = string | number | boolean;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function isSerializableTokenValue(value: unknown): value is SerializableTokenValue {
    const valueType = typeof value;
    return valueType === 'string' || valueType === 'number' || valueType === 'boolean';
}

/**
 * Gera CSS Variables a partir de um conjunto de UiTokens
 * Usado para documentação, build-time ou fallback
 */
export function generateCssVars(tokens: UiTokens): string {
    const lines: string[] = [];

    const addVars = (prefix: string, obj: object) => {
        Object.entries(obj as Record<string, unknown>).forEach(([key, value]) => {
            if (isPlainObject(value)) {
                addVars(`${prefix}-${key}`, value);
            } else if (
                Array.isArray(value)
                || value === null
                || typeof value === 'undefined'
                || typeof value === 'function'
                || typeof value === 'symbol'
            ) {
                return;
            } else if (isSerializableTokenValue(value)) {
                lines.push(`--${prefix}-${key}: ${value};`);
            } else {
                return;
            }
        });
    };

    // Colors
    addVars('color', tokens.colors);

    // Spacing
    addVars('spacing', tokens.spacing);

    // Radius
    addVars('radius', tokens.radius);

    // Typography
    addVars('font-family', tokens.typography.fontFamily);
    addVars('font-size', tokens.typography.fontSize);
    addVars('line-height', tokens.typography.lineHeight);
    addVars('font-weight', tokens.typography.fontWeight);

    // Shadows
    addVars('shadow', tokens.shadows);

    // Z-Index
    addVars('z-index', tokens.zIndex);

    // Accessibility
    addVars('accessibility', tokens.accessibility);

    const sortedLines = [...lines].sort((a, b) => a.localeCompare(b));

    return `:root {\n${sortedLines.map(l => `  ${l}`).join('\n')}\n}`;
}
