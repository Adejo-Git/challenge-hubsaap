// src/app/lib/ui-icons-assets/icon.component.ts

import {
    Component,
    Input,
    ChangeDetectionStrategy,
    OnInit,
    OnChanges,
    HostBinding,
    ChangeDetectorRef,
    ElementRef,
    ViewChild,
} from '@angular/core';

import { loadIcon } from './icon-registry';
import type { IconName } from './icon-names';
import {
    buildAriaAttributes,
    DEFAULT_ICON_SIZE,
    fallbackIconSvg,
    IconColorToken,
    isDecorative,
    resolveIconColor,
    resolveIconSize,
    sanitizeSvg,
    withSvgTitle,
} from './icon.util';

@Component({
    selector: 'hub-icon',
    template: `
    <span
    #iconContainer
      class="hub-icon"
            [attr.aria-hidden]="ariaAttributes['aria-hidden']"
            [attr.role]="ariaAttributes['role']"
            [attr.aria-label]="ariaAttributes['aria-label']"
    ></span>
  `,
    styleUrls: ['./icon.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent implements OnInit, OnChanges {
    @Input({ required: true }) name!: IconName;
    @Input() size: number | string = DEFAULT_ICON_SIZE;
    @Input() color?: IconColorToken | string;
    @Input() decorative = false;
    @Input() title?: string;

    @ViewChild('iconContainer', { static: true })
    private iconContainer!: ElementRef<HTMLElement>;

    ariaAttributes: Record<string, string | null> = {
        role: null,
        'aria-hidden': 'true',
        'aria-label': null,
    };
    private renderCycle = 0;

    @HostBinding('style.width') get width() {
        return resolveIconSize(this.size);
    }

    @HostBinding('style.height') get height() {
        return resolveIconSize(this.size);
    }

    @HostBinding('style.color') get hostColor() {
        return resolveIconColor(this.color);
    }

    constructor(
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.updateIcon();
    }

    ngOnChanges(): void {
        this.updateIcon();
    }

    private setSvgMarkup(svg: string): void {
        const host = this.iconContainer.nativeElement;

        host.innerHTML = '';

        if (typeof DOMParser === 'undefined') {
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(svg, 'image/svg+xml');
        const root = doc.documentElement;

        if (root?.nodeName.toLowerCase() !== 'svg') {
            return;
        }

        host.appendChild(root.cloneNode(true));
    }

    private async updateIcon(): Promise<void> {
        const cycle = ++this.renderCycle;
        const decorative = isDecorative(this.decorative);

        this.ariaAttributes = buildAriaAttributes(decorative, this.name, this.title);

        let rawSvg: string | null = null;
        try {
            rawSvg = await loadIcon(this.name);
        } catch (error) {
            console.warn(`[hub-icon] Falha ao carregar ícone: ${this.name}`, error);
            this.setSvgMarkup(fallbackIconSvg());
            this.cdr.markForCheck();
            return;
        }

        if (cycle !== this.renderCycle) {
            return;
        }

        if (!rawSvg) {
            console.warn(`[hub-icon] Ícone não encontrado: ${this.name}`);
            this.setSvgMarkup(fallbackIconSvg());
            this.cdr.markForCheck();
            return;
        }

        let svg = rawSvg.trim();

        if (!decorative) {
            svg = withSvgTitle(svg, this.title);
        }

        const safeSvg = sanitizeSvg(svg) || fallbackIconSvg();
        this.setSvgMarkup(safeSvg);
        this.cdr.markForCheck();
    }
}
