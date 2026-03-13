// src/app/lib/ui-icons-assets/icon.util.ts

export const DEFAULT_ICON_SIZE = 20;

const DEFAULT_ICON_SIZE_CSS = `var(--spacing-3xl, ${DEFAULT_ICON_SIZE}px)`;

const ICON_SIZE_TOKEN_TO_VAR: Record<string, string> = {
    xs: '--spacing-xs',
    sm: '--spacing-sm',
    md: '--spacing-md',
    lg: '--spacing-lg',
    xl: '--spacing-xl',
    '2xl': '--spacing-2xl',
    '3xl': '--spacing-3xl',
    '4xl': '--spacing-4xl',
    '5xl': '--spacing-5xl',
};

export type IconColorToken =
    | 'text.primary'
    | 'text.secondary'
    | 'text.muted'
    | 'text.inverse'
    | 'brand.primary'
    | 'brand.secondary'
    | 'brand.accent'
    | 'status.success'
    | 'status.warning'
    | 'status.error'
    | 'status.info';

const FORBIDDEN_TAGS = new Set([
    'script',
    'foreignobject',
    'iframe',
    'object',
    'embed',
    'link',
    'meta',
]);

function hasSvgDomSupport(): boolean {
    return typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined';
}

export function isDecorative(decorative?: boolean): boolean {
    return decorative === true;
}

export function toIconLabel(name: string): string {
    return name.replace(/[._-]/g, ' ');
}

export function buildAriaAttributes(
    decorative: boolean,
    name: string,
    title?: string
): Record<string, string | null> {
    if (decorative) {
        return {
            role: null,
            'aria-hidden': 'true',
            'aria-label': null,
        };
    }

    return {
        role: 'img',
        'aria-hidden': null,
        'aria-label': title?.trim() || toIconLabel(name),
    };
}

export function withSvgTitle(svg: string, title?: string): string {
    const safeTitle = title?.trim();

    if (!safeTitle) {
        return svg;
    }

    if (!hasSvgDomSupport()) {
        return svg;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;

    if (root?.nodeName.toLowerCase() !== 'svg') {
        return svg;
    }

    if (root.querySelector('title')) {
        return new XMLSerializer().serializeToString(root);
    }

    const titleElement = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
    titleElement.textContent = safeTitle;
    root.insertBefore(titleElement, root.firstChild);

    return new XMLSerializer().serializeToString(root);
}

export function sanitizeSvg(svg: string): string {
    if (!svg?.trim()) {
        return '';
    }

    if (!hasSvgDomSupport()) {
        return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const root = doc.documentElement;

    if (root?.nodeName.toLowerCase() !== 'svg') {
        return '';
    }

    const elements = [root, ...Array.from(root.querySelectorAll('*'))];

    for (const element of elements) {
        const tagName = element.tagName.toLowerCase();

        if (FORBIDDEN_TAGS.has(tagName)) {
            element.remove();
            continue;
        }

        const attributes = Array.from(element.attributes);
        for (const attribute of attributes) {
            const attrName = attribute.name.toLowerCase();
            const attrValue = attribute.value.trim();
            const normalized = attrValue.toLowerCase();

            if (attrName.startsWith('on')) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (attrName === 'style') {
                element.removeAttribute(attribute.name);
                continue;
            }

            if ((attrName === 'href' || attrName === 'xlink:href') && normalized.startsWith('javascript:')) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if ((attrName === 'href' || attrName === 'xlink:href') && normalized.startsWith('data:text/html')) {
                element.removeAttribute(attribute.name);
            }
        }
    }

    return new XMLSerializer().serializeToString(root);
}

export function resolveIconSize(size?: number | string): string {
    if (typeof size === 'number') {
        return `${size}px`;
    }

    const normalized = size?.trim();
    if (!normalized) {
        return DEFAULT_ICON_SIZE_CSS;
    }

    const cssVar = ICON_SIZE_TOKEN_TO_VAR[normalized];
    if (cssVar) {
        return `var(${cssVar}, ${DEFAULT_ICON_SIZE}px)`;
    }

    return normalized;
}

export function resolveIconColor(color?: IconColorToken | string): string | null {
    const normalized = color?.trim();

    if (!normalized || normalized === 'inherit' || normalized === 'currentColor') {
        return null;
    }

    if (/^[a-z]+\.[a-z]+$/.test(normalized)) {
        return `var(--color-${normalized.replace('.', '-')}, currentColor)`;
    }

    return normalized;
}

export function fallbackIconSvg(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="1" /></svg>';
}
