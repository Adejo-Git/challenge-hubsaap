import type { AssetName } from './asset-names';

export type AssetLoader = () => Promise<string>;

export const ASSET_REGISTRY: Record<AssetName, AssetLoader> = {
    'brand.hub.logo.mono': async () =>
        (await import('./ui-assets/brand-hub-logo-mono.svg')).BRAND_HUB_LOGO_MONO_SVG,
};

export async function loadAsset(name: AssetName): Promise<string | null> {
    const loader = ASSET_REGISTRY[name];

    if (!loader) {
        return null;
    }

    return loader();
}
