// src/app/lib/ui-layout/sidebar/sidebar.component.ts

import {
    Component,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    ElementRef,
    HostListener,
    OnChanges,
    ViewChild,
} from '@angular/core';

@Component({
    selector: 'ui-sidebar',
    standalone: false,
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnChanges {
    /**
     * Controla se a sidebar está colapsada
     */
    @Input() collapsed = false;

    /**
     * Indica se está em modo mobile (drawer)
     */
    @Input() mobile = false;

    /**
     * Estado de abertura do drawer no mobile.
     * Só tem efeito quando mobile=true.
     */
    @Input() mobileOpen = false;

    /**
     * Nodes prontos para renderização de menu.
     * O ui-layout NÃO processa nem decide visibilidade.
     */
    @Input() nodes?: unknown[];

    /**
     * Fallback de foco quando o originador do drawer não existir mais.
     */
    @Input() focusFallbackSelector = '[data-ui-focus-fallback], main, [role="main"], ui-content-frame';

    /**
     * Solicita fechamento do drawer em ações acessíveis (ex: Escape)
     */
    @Output() closeRequest = new EventEmitter<void>();

    @ViewChild('sidebarElement') sidebarElement?: ElementRef<HTMLElement>;

    private isDrawerOpen = false;
    private focusReturnTarget: HTMLElement | null = null;

    ngOnChanges(): void {
        const drawerOpen = this.mobile && this.mobileOpen;

        if (!this.isDrawerOpen && drawerOpen) {
            const activeElement = document.activeElement;
            this.focusReturnTarget = activeElement instanceof HTMLElement ? activeElement : null;

            queueMicrotask(() => {
                this.sidebarElement?.nativeElement.focus();
            });
        }

        if (this.isDrawerOpen && !drawerOpen) {
            queueMicrotask(() => {
                this.restoreFocus();
                this.focusReturnTarget = null;
            });
        }

        this.isDrawerOpen = drawerOpen;
    }

    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        if (this.mobile && this.mobileOpen) {
            this.closeRequest.emit();
        }
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
}
