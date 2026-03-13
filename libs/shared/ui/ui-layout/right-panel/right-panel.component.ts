// src/app/lib/ui-layout/right-panel/right-panel.component.ts

import {
    Component,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    ElementRef,
    HostListener,
    OnChanges,
    SimpleChanges,
    ViewChild,
} from '@angular/core';

import { RightPanelState } from '../ui-layout.model';

@Component({
    selector: 'ui-right-panel',
    standalone: false,
    templateUrl: './right-panel.component.html',
    styleUrls: ['./right-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RightPanelComponent implements OnChanges {
    /**
     * Estado externo do painel
     */
    @Input() state: RightPanelState = { open: false };

    /**
     * Rótulo acessível quando não houver heading interno associado.
     */
    @Input() ariaLabel: string | null = 'Painel lateral';

    /**
     * ID de elemento visível que nomeia o diálogo.
     */
    @Input() ariaLabelledby: string | null = null;

    /**
     * ID de elemento que descreve o diálogo.
     */
    @Input() ariaDescribedby: string | null = null;

    /**
     * Se `true`, tenta usar automaticamente um heading interno como `aria-labelledby`.
     */
    @Input() autoLabelFromHeading = true;

    /**
     * Fallback de foco quando o elemento originador não estiver mais disponível.
     */
    @Input() focusFallbackSelector = '[data-ui-focus-fallback], main, [role="main"], ui-content-frame';

    /**
     * Solicitação de fechamento (ex: overlay)
     */
    @Output() close = new EventEmitter<void>();

    @ViewChild('panelElement') panelElement?: ElementRef<HTMLElement>;

    private focusReturnTarget: HTMLElement | null = null;
    private resolvedAriaLabelledby: string | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        const stateChange = changes['state'];

        if (!stateChange) {
            return;
        }

        const previousOpen = stateChange.previousValue?.open;
        const currentOpen = stateChange.currentValue?.open;

        if (!previousOpen && currentOpen) {
            const activeElement = document.activeElement;
            this.focusReturnTarget = activeElement instanceof HTMLElement ? activeElement : null;
            this.resolveAriaLabelledby();

            queueMicrotask(() => {
                this.panelElement?.nativeElement.focus();
            });

            return;
        }

        if (previousOpen && !currentOpen) {
            queueMicrotask(() => {
                this.restoreFocus();
                this.focusReturnTarget = null;
            });
        }
    }

    getComputedAriaLabelledby(): string | null {
        return this.ariaLabelledby || this.resolvedAriaLabelledby;
    }

    private resolveAriaLabelledby(): void {
        if (this.ariaLabelledby || !this.autoLabelFromHeading) {
            this.resolvedAriaLabelledby = null;
            return;
        }

        const panel = this.panelElement?.nativeElement;
        if (!panel) {
            this.resolvedAriaLabelledby = null;
            return;
        }

        const heading = panel.querySelector<HTMLElement>('[data-ui-right-panel-title], h1, h2, h3');
        if (!heading) {
            this.resolvedAriaLabelledby = null;
            return;
        }

        if (!heading.id) {
            heading.id = `ui-right-panel-title-${Math.random().toString(36).slice(2, 9)}`;
        }

        this.resolvedAriaLabelledby = heading.id;
    }

    private restoreFocus(): void {
        if (this.tryFocusElement(this.focusReturnTarget)) {
            return;
        }

        const fallbackElement = this.findFallbackFocusElement();
        this.tryFocusElement(fallbackElement);
    }

    private findFallbackFocusElement(): HTMLElement | null {
        if (!this.focusFallbackSelector?.trim()) {
            return null;
        }

        return document.querySelector<HTMLElement>(this.focusFallbackSelector);
    }

    private tryFocusElement(element: HTMLElement | null): boolean {
        if (!element || !element.isConnected) {
            return false;
        }

        const hasTabIndex = element.hasAttribute('tabindex');
        const tabIndex = element.tabIndex;

        if (tabIndex < 0 && !hasTabIndex) {
            element.setAttribute('tabindex', '-1');
            element.focus();
            element.removeAttribute('tabindex');
            return document.activeElement === element;
        }

        element.focus();
        return document.activeElement === element;
    }

    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this.state.open) {
            this.close.emit();
        }
    }

    onOverlayClick(): void {
        this.close.emit();
    }
}
