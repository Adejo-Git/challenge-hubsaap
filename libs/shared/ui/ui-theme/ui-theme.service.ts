// src/app/lib/ui-theme/ui-theme.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { UI_TOKENS_LIGHT, UI_TOKENS_DARK, UiTokens } from '@hub/shared/ui-tokens';
import { UiTheme, ThemeKey, ThemeState } from './ui-theme.model';
import { applyThemeStrategy } from './ui-theme.apply';
import { loadTheme, saveTheme } from './ui-theme.storage';
import { internalLog } from './logger';

function cloneTokens(tokens: UiTokens): UiTokens {
    if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(tokens);
    }

    return JSON.parse(JSON.stringify(tokens)) as UiTokens;
}

@Injectable({ providedIn: 'root' })
export class UiThemeService {
    private readonly themes: Record<ThemeKey, UiTheme> = {
        light: { key: 'light', variant: 'default', tokens: cloneTokens(UI_TOKENS_LIGHT) },
        dark: { key: 'dark', variant: 'default', tokens: cloneTokens(UI_TOKENS_DARK) },
    };

    private state$ = new BehaviorSubject<ThemeState>({
        key: 'dark',
        variant: 'default',
        reducedMotion: false,
    });

    /**
     * Deve ser chamado no bootstrap do AppShell
     * antes do render pesado
     */
    init(): void {
        const saved = loadTheme();
        const systemPrefersDark = this.matchesMedia('(prefers-color-scheme: dark)');
        const reducedMotion = this.matchesMedia('(prefers-reduced-motion: reduce)');

        const key: ThemeKey = saved ?? (systemPrefersDark ? 'dark' : 'light');

        this.applyTheme(key, reducedMotion);
    }

    setTheme(key: ThemeKey): void {
        const reducedMotion = this.state$.value.reducedMotion;
        this.applyTheme(key, reducedMotion);
        saveTheme(key);
    }

    toggleTheme(): void {
        const next: ThemeKey =
            this.state$.value.key === 'dark' ? 'light' : 'dark';

        this.setTheme(next);
    }

    watchTheme(): Observable<ThemeState> {
        return this.state$.asObservable();
    }

    snapshot(): ThemeState {
        return this.state$.value;
    }

    getThemeTokens(key?: ThemeKey): UiTokens {
        const resolvedKey = key ?? this.state$.value.key;
        return (this.themes[resolvedKey] ?? this.themes.dark).tokens;
    }

    private matchesMedia(query: string): boolean {
        try {
            if (typeof window === 'undefined' || typeof (window as any).matchMedia !== 'function') {
                return false;
            }

            // wrap call in try/catch in case platform provides a non-standard matchMedia
            try {
                return window.matchMedia(query).matches;
            } catch (err) {
                // log internally so test runner captures error context
                // eslint-disable-next-line no-console
                console.error('[UiThemeService] matchesMedia threw', { query, err: String(err) });
                return false;
            }
        } catch (err) {
            // defensive fallback for weird global/window shapes in SSR
            // eslint-disable-next-line no-console
            console.error('[UiThemeService] matchesMedia unexpected error', { query, err: String(err) });
            return false;
        }
    }

    private applyTheme(key: ThemeKey, reducedMotion: boolean): void {
        const theme = this.themes[key] ?? this.themes.dark;

        applyThemeStrategy(key, theme.tokens);

        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.setProperty('--accessibility-reducedMotion', String(reducedMotion));
            document.documentElement.style.setProperty(
                '--accessibility-motionFast',
                reducedMotion ? '0ms' : theme.tokens.accessibility.motionFast
            );
            document.documentElement.style.setProperty(
                '--accessibility-motionBase',
                reducedMotion ? '0ms' : theme.tokens.accessibility.motionBase
            );
        }

        this.state$.next({ key: theme.key, variant: theme.variant, reducedMotion });
    }
}
