// src/app/lib/ui-icons-assets/icon-registry.ts

import type { IconName } from './icon-names';

export type IconLoader = () => Promise<string>;

/**
 * Registro controlado de ícones por loader.
 *
 * - Imports por ícone (evita pacote único)
 * - API estável por nome público
 * - Lib autocontida
 */
export const ICON_REGISTRY: Record<IconName, IconLoader> = {
    'nav.home': async () => (await import('./ui-icons/nav-home.svg')).NAV_HOME_SVG,
    'status.success': async () => (await import('./ui-icons/status-success.svg')).STATUS_SUCCESS_SVG,
    'status.error': async () => (await import('./ui-icons/status-error.svg')).STATUS_ERROR_SVG,
};

export async function loadIcon(name: IconName): Promise<string | null> {
    const loader = ICON_REGISTRY[name];

    if (!loader) {
        return null;
    }

    return loader();
}
