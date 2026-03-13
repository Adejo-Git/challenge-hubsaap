import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { UiLayoutModule } from './ui-layout.module';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
    standalone: false,
    template: `
    <ui-layout-shell>
      <ui-topbar>Topbar</ui-topbar>
      <ui-sidebar>Sidebar</ui-sidebar>
      <ui-content-frame>Content</ui-content-frame>
      <ui-right-panel [state]="{ open: false }">RightPanel</ui-right-panel>
    </ui-layout-shell>
  `,
})
class LayoutHostComponent {}

@Component({
    standalone: false,
    template: `
        <ui-right-panel [state]="state">RightPanel</ui-right-panel>
    `,
})
class RightPanelHostComponent {
    state = { open: false };
}

@Component({
    standalone: false,
    template: `
        <button type="button" id="sidebar-trigger">Abrir</button>
        <ui-sidebar [mobile]="true" [mobileOpen]="mobileOpen">Sidebar</ui-sidebar>
    `,
})
class SidebarHostComponent {
    mobileOpen = false;
}

@Component({
    standalone: false,
    template: `
        <div id="fallback" data-ui-focus-fallback>Fallback</div>
        <ui-right-panel [state]="state">
            <h2 data-ui-right-panel-title>Título do painel</h2>
        </ui-right-panel>
    `,
})
class RightPanelHeadingHostComponent {
    state = { open: false };
}

@Component({
    standalone: false,
    template: `
        <div id="fallback" data-ui-focus-fallback>Fallback</div>
        <ui-sidebar [mobile]="true" [mobileOpen]="mobileOpen">Sidebar</ui-sidebar>
    `,
})
class SidebarFallbackHostComponent {
    mobileOpen = false;
}

describe('UiLayout', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UiLayoutModule],
            declarations: [
                LayoutHostComponent,
                RightPanelHostComponent,
                SidebarHostComponent,
                RightPanelHeadingHostComponent,
                SidebarFallbackHostComponent,
            ],
        }).compileComponents();
    });

    it('should compose layout shell with topbar/sidebar/content/right-panel slots', () => {
        const fixture = TestBed.createComponent(LayoutHostComponent);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.ui-layout-shell__topbar ui-topbar')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.ui-layout-shell__sidebar ui-sidebar')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.ui-layout-shell__content ui-content-frame')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('.ui-layout-shell__right-panel ui-right-panel')).toBeTruthy();
    });

    it('should support sidebar collapsed and mobile drawer states', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        fixture.componentInstance.collapsed = true;
        fixture.componentInstance.mobile = true;
        fixture.componentInstance.mobileOpen = false;
        fixture.detectChanges();

        const aside = fixture.nativeElement.querySelector('.ui-sidebar');

        expect(aside.classList.contains('ui-sidebar--collapsed')).toBe(true);
        expect(aside.classList.contains('ui-sidebar--mobile')).toBe(true);
        expect(aside.classList.contains('ui-sidebar--mobile-open')).toBe(false);

        const openFixture = TestBed.createComponent(SidebarComponent);
        openFixture.componentInstance.collapsed = true;
        openFixture.componentInstance.mobile = true;
        openFixture.componentInstance.mobileOpen = true;
        openFixture.detectChanges();
        const openAside = openFixture.nativeElement.querySelector('.ui-sidebar');

        expect(openAside.classList.contains('ui-sidebar--mobile-open')).toBe(true);
    });

    it('should expose aria-hidden for sidebar in mobile closed state', () => {
        const fixture = TestBed.createComponent(SidebarComponent);

        fixture.componentInstance.mobile = true;
        fixture.componentInstance.mobileOpen = false;
        fixture.detectChanges();

        const aside = fixture.nativeElement.querySelector('.ui-sidebar') as HTMLElement;
        expect(aside.getAttribute('aria-hidden')).toBe('true');

        const openFixture = TestBed.createComponent(SidebarComponent);
        openFixture.componentInstance.mobile = true;
        openFixture.componentInstance.mobileOpen = true;
        openFixture.detectChanges();
        const openAside = openFixture.nativeElement.querySelector('.ui-sidebar') as HTMLElement;

        expect(openAside.getAttribute('aria-hidden')).toBe('false');
    });

    it('should emit closeRequest when Escape is pressed in mobile open state', () => {
        const fixture = TestBed.createComponent(SidebarComponent);
        const closeSpy = jest.fn();

        fixture.componentInstance.mobile = true;
        fixture.componentInstance.mobileOpen = true;
        fixture.componentInstance.closeRequest.subscribe(closeSpy);
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit close event when right-panel overlay is clicked', () => {
        const fixture = TestBed.createComponent(RightPanelComponent);
        const closeSpy = jest.fn();

        fixture.componentInstance.state = { open: true };
        fixture.componentInstance.close.subscribe(closeSpy);
        fixture.detectChanges();

        const overlay = fixture.debugElement.query(By.css('.ui-right-panel__overlay'));
        overlay.triggerEventHandler('click');

        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit close event when Escape is pressed and panel is open', () => {
        const fixture = TestBed.createComponent(RightPanelComponent);
        const closeSpy = jest.fn();

        fixture.componentInstance.state = { open: true };
        fixture.componentInstance.close.subscribe(closeSpy);
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('should focus right-panel when it opens', fakeAsync(() => {
        const fixture = TestBed.createComponent(RightPanelHostComponent);

        fixture.detectChanges();
        fixture.componentInstance.state = { open: true };
        fixture.detectChanges();
        tick();

        const panel = fixture.debugElement.query(By.css('.ui-right-panel')).nativeElement as HTMLElement;
        expect(document.activeElement).toBe(panel);
    }));

    it('should restore focus to trigger element when right-panel closes', fakeAsync(() => {
        const fixture = TestBed.createComponent(RightPanelHostComponent);
        const trigger = document.createElement('button');

        document.body.appendChild(trigger);
        trigger.focus();

        fixture.detectChanges();
        fixture.componentInstance.state = { open: true };
        fixture.detectChanges();
        tick();

        fixture.componentInstance.state = { open: false };
        fixture.detectChanges();
        tick();

        expect(document.activeElement).toBe(trigger);
        document.body.removeChild(trigger);
    }));

    it('should expose aria-label in right-panel when ariaLabelledby is not provided', () => {
        const fixture = TestBed.createComponent(RightPanelComponent);

        fixture.componentInstance.state = { open: true };
        fixture.componentInstance.ariaLabel = 'Painel de notificações';
        fixture.detectChanges();

        const panel = fixture.nativeElement.querySelector('.ui-right-panel') as HTMLElement;

        expect(panel.getAttribute('aria-label')).toBe('Painel de notificações');
        expect(panel.getAttribute('aria-labelledby')).toBeNull();
    });

    it('should restore focus to trigger element when mobile sidebar closes', fakeAsync(() => {
        const fixture = TestBed.createComponent(SidebarHostComponent);

        fixture.detectChanges();
        const trigger = fixture.nativeElement.querySelector('#sidebar-trigger') as HTMLButtonElement;

        trigger.focus();
        fixture.componentInstance.mobileOpen = true;
        fixture.detectChanges();
        tick();

        fixture.componentInstance.mobileOpen = false;
        fixture.detectChanges();
        tick();

        expect(document.activeElement).toBe(trigger);
    }));

    it('should use heading as aria-labelledby when available in right-panel content', fakeAsync(() => {
        const fixture = TestBed.createComponent(RightPanelHeadingHostComponent);

        fixture.detectChanges();
        fixture.componentInstance.state = { open: true };
        fixture.detectChanges();
        tick();

        const panel = fixture.nativeElement.querySelector('.ui-right-panel') as HTMLElement;
        const heading = fixture.nativeElement.querySelector('[data-ui-right-panel-title]') as HTMLElement;

        expect(heading.id).toBeTruthy();
        expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
        expect(panel.getAttribute('aria-label')).toBeNull();
    }));

    it('should fallback focus when right-panel opener is removed from DOM', fakeAsync(() => {
        const fixture = TestBed.createComponent(RightPanelHostComponent);
        const trigger = document.createElement('button');

        trigger.id = 'right-panel-trigger';
        document.body.appendChild(trigger);
        trigger.focus();

        fixture.detectChanges();
        fixture.componentInstance.state = { open: true };
        fixture.detectChanges();
        tick();

        document.body.removeChild(trigger);

        const fallback = document.createElement('div');
        fallback.id = 'fallback';
        fallback.setAttribute('data-ui-focus-fallback', '');
        document.body.appendChild(fallback);

        fixture.componentInstance.state = { open: false };
        fixture.detectChanges();
        tick();

        expect(document.activeElement).toBe(fallback);
        document.body.removeChild(fallback);
    }));

    it('should fallback focus when sidebar opener is removed from DOM', fakeAsync(() => {
        const fixture = TestBed.createComponent(SidebarFallbackHostComponent);
        const trigger = document.createElement('button');

        document.body.appendChild(trigger);
        trigger.focus();

        fixture.detectChanges();
        fixture.componentInstance.mobileOpen = true;
        fixture.detectChanges();
        tick();

        document.body.removeChild(trigger);

        const fallback = fixture.nativeElement.querySelector('#fallback') as HTMLElement;
        fixture.componentInstance.mobileOpen = false;
        fixture.detectChanges();
        tick();

        expect(document.activeElement).toBe(fallback);
    }));
});
