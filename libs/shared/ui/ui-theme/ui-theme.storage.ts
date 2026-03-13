// src/app/lib/ui-theme/ui-theme.storage.ts

import { ThemeKey } from './ui-theme.model';

export const THEME_STORAGE_KEY = '@hub/ui-theme:preference';

export interface ThemeStorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

function createDefaultStorageAdapter(): ThemeStorageAdapter {
    return {
        getItem(key: string): string | null {
            if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
                return null;
            }

            try {
                return globalThis.localStorage.getItem(key);
            } catch {
                return null;
            }
        },
        setItem(key: string, value: string): void {
            if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
                return;
            }

            try {
                globalThis.localStorage.setItem(key, value);
            } catch {
                // noop: storage indisponível ou bloqueado
            }
        },
    };
}

let storageAdapter: ThemeStorageAdapter = createDefaultStorageAdapter();

function isThemeKey(value: string | null): value is ThemeKey {
    return value === 'light' || value === 'dark';
}

export function setThemeStorageAdapter(adapter: ThemeStorageAdapter): void {
    storageAdapter = adapter;
}

export function resetThemeStorageAdapter(): void {
    storageAdapter = createDefaultStorageAdapter();
}

export function saveTheme(key: ThemeKey): void {
    try {
        storageAdapter.setItem(THEME_STORAGE_KEY, key);
    } catch {
        // noop: storage indisponível ou bloqueado
    }
}

export function loadTheme(): ThemeKey | null {
    try {
        const value = storageAdapter.getItem(THEME_STORAGE_KEY);
        return isThemeKey(value) ? value : null;
    } catch {
        return null;
    }
}
