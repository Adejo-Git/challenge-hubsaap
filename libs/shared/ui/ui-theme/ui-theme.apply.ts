// src/app/lib/ui-theme/ui-theme.apply.ts

import { UiTokens } from '@hub/shared/ui-tokens';
import { ThemeKey } from './ui-theme.model';

const appliedCssVariables = new Map<string, string>();

export interface UiThemeApplyObservabilityEvent {
    source: 'ui-theme.apply';
    operation: string;
    error: unknown;
}

export interface UiThemeApplyObservabilityAdapter {
    trackError(event: UiThemeApplyObservabilityEvent): void;
}

const noopObservabilityAdapter: UiThemeApplyObservabilityAdapter = {
    trackError: () => undefined,
};

let observabilityAdapter: UiThemeApplyObservabilityAdapter = noopObservabilityAdapter;

export function setThemeApplyObservabilityAdapter(adapter: UiThemeApplyObservabilityAdapter): void {
    observabilityAdapter = adapter;
}

export function resetThemeApplyObservabilityAdapter(): void {
    observabilityAdapter = noopObservabilityAdapter;
}

function reportThemeApplyError(operation: string, error: unknown): void {
    try {
        observabilityAdapter.trackError({
            source: 'ui-theme.apply',
            operation,
            error,
        });
    } catch {
        // noop: adapter de observabilidade não deve quebrar aplicação de tema
    }
}

function getRootElement(): HTMLElement | null {
    if (typeof document === 'undefined') {
        return null;
    }

    return document.documentElement ?? null;
}

function setCssVariable(root: HTMLElement, name: string, value: string, nextVariables: Set<string>): void {
    nextVariables.add(name);

    const previousValue = appliedCssVariables.get(name);
    const currentDomValue = root.style.getPropertyValue(name).trim();

    if (previousValue === value && currentDomValue === value) {
        return;
    }

    root.style.setProperty(name, value);
    appliedCssVariables.set(name, value);
}

function applyVarGroup(prefix: string, values: object, root: HTMLElement, nextVariables: Set<string>): void {
    try {
        Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                applyVarGroup(`${prefix}-${key}`, value, root, nextVariables);
                return;
            }

            setCssVariable(root, `--${prefix}-${key}`, String(value), nextVariables);
        });
    } catch (error) {
        reportThemeApplyError('applyVarGroup', error);
    }
}

function pruneRemovedVariables(root: HTMLElement, nextVariables: Set<string>): void {
    for (const variableName of appliedCssVariables.keys()) {
        if (nextVariables.has(variableName)) {
            continue;
        }

        root.style.removeProperty(variableName);
        appliedCssVariables.delete(variableName);
    }
}

export function applyThemeStrategy(
    theme: ThemeKey,
    tokens: UiTokens
): void {
    try {
        const root = getRootElement();
        if (!root) {
            return;
        }

        const nextVariables = new Set<string>();

        root.setAttribute('data-theme', theme);

        // Colors
        Object.entries(tokens.colors).forEach(([group, values]) => {
            Object.entries(values as Record<string, string>).forEach(([key, value]) => {
                setCssVariable(root, `--color-${group}-${key}`, value, nextVariables);
            });
        });

        // Spacing
        Object.entries(tokens.spacing).forEach(([key, value]) => {
            setCssVariable(root, `--spacing-${key}`, value, nextVariables);
        });

        // Radius
        Object.entries(tokens.radius).forEach(([key, value]) => {
            setCssVariable(root, `--radius-${key}`, value, nextVariables);
        });

        // Typography
        Object.entries(tokens.typography.fontFamily).forEach(([key, value]) => {
            setCssVariable(root, `--font-family-${key}`, value, nextVariables);
        });

        Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
            setCssVariable(root, `--font-size-${key}`, value, nextVariables);
        });

        Object.entries(tokens.typography.lineHeight).forEach(([key, value]) => {
            setCssVariable(root, `--line-height-${key}`, value, nextVariables);
        });

        Object.entries(tokens.typography.fontWeight).forEach(([key, value]) => {
            setCssVariable(root, `--font-weight-${key}`, String(value), nextVariables);
        });

        // Shadows
        Object.entries(tokens.shadows).forEach(([key, value]) => {
            setCssVariable(root, `--shadow-${key}`, value, nextVariables);
        });

        // Z-Index
        Object.entries(tokens.zIndex).forEach(([key, value]) => {
            setCssVariable(root, `--z-index-${key}`, String(value), nextVariables);
        });

        // Accessibility
        applyVarGroup('accessibility', tokens.accessibility, root, nextVariables);

        pruneRemovedVariables(root, nextVariables);
    } catch (error) {
        reportThemeApplyError('applyThemeStrategy', error);
    }
}

export function clearThemeStrategy(): void {
    try {
        const root = getRootElement();
        if (!root) {
            return;
        }

        root.removeAttribute('data-theme');

        for (const variable of appliedCssVariables.keys()) {
            root.style.removeProperty(variable);
        }

        appliedCssVariables.clear();
    } catch (error) {
        reportThemeApplyError('clearThemeStrategy', error);
    }
}
