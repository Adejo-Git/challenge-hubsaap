// src/app/lib/ui-icons-assets/ui-icons-assets.spec.ts

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IconComponent } from './icon.component';
import { IconName } from './icon-names';
import { ASSET_REGISTRY, loadAsset } from './asset-registry';
import { ICON_REGISTRY, loadIcon } from './icon-registry';
import * as iconRegistry from './icon-registry';
import { sanitizeSvg } from './icon.util';

@Component({
    standalone: false,
    template: `
    <hub-icon
      [name]="name"
      [decorative]="decorative"
      [title]="title"
      [size]="size"
            [color]="color"
    ></hub-icon>
  `,
})
class IconHostComponent {
    name: IconName = 'status.success';
    decorative = false;
    title?: string;
        size: number | string = 20;
        color?: string;
}

describe('UiIconsAssets', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IconComponent],
            declarations: [IconHostComponent],
        }).compileComponents();
    });

    it('deve conter todos os ícones definidos no contrato', () => {
        const names = Object.keys(ICON_REGISTRY) as IconName[];

        expect(names.length).toBeGreaterThan(0);
        expect(names).toEqual(expect.arrayContaining(['nav.home', 'status.success', 'status.error']));
    });

    it('deve conter assets estáticos no registry dedicado', () => {
        const names = Object.keys(ASSET_REGISTRY);

        expect(names.length).toBeGreaterThan(0);
        expect(names).toEqual(expect.arrayContaining(['brand.hub.logo.mono']));
    });

    it('deve carregar asset estático válido pelo registry controlado', async () => {
        const asset = await loadAsset('brand.hub.logo.mono');

        expect(asset).toBeTruthy();
        expect(asset).toContain('<svg');
    });

    it('deve carregar ícone válido pelo registry controlado', async () => {
        const icon = await loadIcon('status.success');

        expect(icon).toBeTruthy();
        expect(icon).toContain('<svg');
    });

    it('deve renderizar ícone informativo com aria correta', async () => {
        const fixture = TestBed.createComponent(IconHostComponent);
        fixture.componentInstance.name = 'status.success';
        fixture.componentInstance.decorative = false;
        fixture.componentInstance.title = 'Status de sucesso';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const span: HTMLSpanElement = fixture.nativeElement.querySelector('.hub-icon');

        expect(span.getAttribute('role')).toBe('img');
        expect(span.getAttribute('aria-hidden')).toBeNull();
        expect(span.getAttribute('aria-label')).toBe('Status de sucesso');
    });

    it('deve renderizar ícone decorativo com aria-hidden', async () => {
        const fixture = TestBed.createComponent(IconHostComponent);
        fixture.componentInstance.name = 'nav.home';
        fixture.componentInstance.decorative = true;
        fixture.componentInstance.title = undefined;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const span: HTMLSpanElement = fixture.nativeElement.querySelector('.hub-icon');

        expect(span.getAttribute('role')).toBeNull();
        expect(span.getAttribute('aria-hidden')).toBe('true');
        expect(span.getAttribute('aria-label')).toBeNull();
    });

    it('deve aplicar fallback e warning para nome inválido', async () => {
        const fixture = TestBed.createComponent(IconComponent);
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        fixture.componentInstance.name = 'invalid.icon' as IconName;
        fixture.componentInstance.decorative = false;
        fixture.componentInstance.title = 'Ícone inválido';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const span: HTMLSpanElement = fixture.nativeElement.querySelector('.hub-icon');

        expect(warnSpy).toHaveBeenCalled();
        expect(span.innerHTML).toContain('<svg');

        warnSpy.mockRestore();
    });

    it('deve sanitizar svg removendo script e atributos de evento', async () => {
        const raw = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert('xss')">
              <script>alert('xss')</script>
              <circle cx="12" cy="12" r="10" />
            </svg>
        `;

        const sanitized = sanitizeSvg(raw).toLowerCase();

        expect(sanitized).toContain('<svg');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('onload=');
    });

    it('deve sanitizar vetores adicionais de xss (foreignObject, iframe, style e hrefs perigosos)', () => {
        const raw = `
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
              <foreignObject><div>bad</div></foreignObject>
              <iframe src="https://malicious.example"></iframe>
              <a href="javascript:alert('xss')" xlink:href="javascript:alert('xss')">bad-link</a>
              <a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">bad-data</a>
              <circle style="color:red" cx="12" cy="12" r="10" />
            </svg>
        `;

        const sanitized = sanitizeSvg(raw).toLowerCase();

        expect(sanitized).toContain('<svg');
        expect(sanitized).not.toContain('<foreignobject');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('style=');
        expect(sanitized).not.toContain('href="javascript:');
        expect(sanitized).not.toContain('xlink:href="javascript:');
        expect(sanitized).not.toContain('href="data:text/html');
    });

    it('deve sanitizar svg grande mantendo segurança e estrutura básica', () => {
        const circles = Array.from({ length: 1200 }, (_, index) => {
            const coordinate = index % 24;
            return `<circle cx="${coordinate}" cy="${coordinate}" r="1" />`;
        }).join('');

        const raw = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert('xss')">
              <script>alert('xss')</script>
              ${circles}
            </svg>
        `;

        const sanitized = sanitizeSvg(raw).toLowerCase();

        expect(sanitized).toContain('<svg');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).toContain('<circle');
    });

    it('deve retornar vazio quando não houver suporte de DOMParser em ambiente SSR puro', () => {
        const originalDomParser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
        const originalXmlSerializer = (globalThis as { XMLSerializer?: typeof XMLSerializer }).XMLSerializer;

        delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
        delete (globalThis as { XMLSerializer?: typeof XMLSerializer }).XMLSerializer;

        try {
            expect(sanitizeSvg('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>')).toBe('');
        } finally {
            if (originalDomParser) {
                (globalThis as { DOMParser?: typeof DOMParser }).DOMParser = originalDomParser;
            }

            if (originalXmlSerializer) {
                (globalThis as { XMLSerializer?: typeof XMLSerializer }).XMLSerializer = originalXmlSerializer;
            }
        }
    });

    it('não deve lançar erro no componente quando DOMParser estiver indisponível', async () => {
        const originalDomParser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
        delete (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;

        try {
            const fixture = TestBed.createComponent(IconComponent);

            fixture.componentInstance.name = 'status.success';
            fixture.componentInstance.decorative = false;

            expect(() => fixture.detectChanges()).not.toThrow();
            await fixture.whenStable();
            fixture.detectChanges();

            const span: HTMLSpanElement = fixture.nativeElement.querySelector('.hub-icon');
            expect(span.innerHTML).toBe('');
        } finally {
            if (originalDomParser) {
                (globalThis as { DOMParser?: typeof DOMParser }).DOMParser = originalDomParser;
            }
        }
    });

    it('deve sanitizar o innerHTML final ao renderizar SVG malicioso', async () => {
        const fixture = TestBed.createComponent(IconComponent);
        const maliciousSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert('xss')">
              <script>alert('xss')</script>
              <circle cx="12" cy="12" r="10" />
            </svg>
        `;
        const loadIconSpy = jest
            .spyOn(iconRegistry, 'loadIcon')
            .mockResolvedValue(maliciousSvg);

        fixture.componentInstance.name = 'status.success';
        fixture.componentInstance.decorative = false;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const span: HTMLSpanElement = fixture.nativeElement.querySelector('.hub-icon');
        const html = span.innerHTML.toLowerCase();

        expect(html).toContain('<svg');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('onload=');

        loadIconSpy.mockRestore();
    });

    it('deve aceitar size como string para layout responsivo', async () => {
        const fixture = TestBed.createComponent(IconComponent);

        fixture.componentInstance.name = 'status.success';
        fixture.componentInstance.size = '1.5rem';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.style.width).toBe('1.5rem');
        expect(host.style.height).toBe('1.5rem');
    });

    it('deve mapear size token para css var de ui-tokens', async () => {
        const fixture = TestBed.createComponent(IconComponent);

        fixture.componentInstance.name = 'status.success';
        fixture.componentInstance.size = '3xl';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.componentInstance.width).toBe('var(--spacing-3xl, 20px)');
        expect(fixture.componentInstance.height).toBe('var(--spacing-3xl, 20px)');
    });

    it('deve mapear color token para css var de ui-theme', async () => {
        const fixture = TestBed.createComponent(IconComponent);

        fixture.componentInstance.name = 'status.success';
        fixture.componentInstance.color = 'status.success';
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.componentInstance.hostColor).toBe('var(--color-status-success, currentColor)');
    });
});
