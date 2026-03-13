import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { UiIconsAssetsModule } from '@hub/ui-icons-assets';
import { ErrorPageComponent, ERROR_PAGE_OBSERVABILITY, ObservabilityService } from './error-page.component';

describe('ErrorPageComponent', () => {
    const observabilityServiceMock: ObservabilityService = {
        trackError: jest.fn(),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RouterTestingModule.withRoutes([]), UiIconsAssetsModule, ErrorPageComponent],
            providers: [
                {
                    provide: ERROR_PAGE_OBSERVABILITY,
                    useValue: observabilityServiceMock,
                },
            ],
        }).compileComponents();

        jest.clearAllMocks();
    });

    it('renderiza estado auth com CTA principal de login', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        fixture.componentInstance.type = 'auth';
        fixture.componentInstance.details = { message: 'Sessão inválida' } as unknown as Record<string, unknown>;

        fixture.detectChanges();

        const title = fixture.nativeElement.querySelector('.error-page__title')?.textContent;
        const primaryButton = fixture.nativeElement.querySelector('.error-page__button--primary')?.textContent;

        expect(title).toContain('Sua sessão expirou');
        expect(primaryButton).toContain('Ir para login');
    });

    it('renderiza estado permission com CTA de solicitar acesso', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        fixture.componentInstance.type = 'permission';
        fixture.componentInstance.details = { message: 'Sem permissão' } as unknown as Record<string, unknown>;

        fixture.detectChanges();

        const primaryButton = fixture.nativeElement.querySelector('.error-page__button--primary')?.textContent;

        expect(primaryButton).toContain('Solicitar acesso');
    });

    it('renderiza estado not-found com CTA de dashboard', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        fixture.componentInstance.type = 'not-found';

        fixture.detectChanges();

        const primaryButton = fixture.nativeElement.querySelector('.error-page__button--primary')?.textContent;

        expect(primaryButton).toContain('Voltar ao dashboard');
    });

    it('renderiza estado crash e exibe correlation id quando disponível', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        fixture.componentInstance.type = 'crash';
        fixture.componentInstance.details = {
            status: 500,
            correlationId: 'corr-500',
            message: 'Falha inesperada',
        } as unknown as Record<string, unknown>;

        fixture.detectChanges();

        const correlationId = fixture.nativeElement.querySelector('.error-page__correlation')?.textContent;

        expect(correlationId).toContain('corr-500');
    });

    it('chama trackError no init com payload seguro', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        fixture.componentInstance.type = 'crash';
        fixture.componentInstance.details = {
            status: 500,
            correlationId: 'corr-500',
            url: '/tools/audit',
        } as unknown as Record<string, unknown>;

        fixture.detectChanges();

        expect(observabilityServiceMock.trackError).toHaveBeenCalledWith({
            code: '500',
            correlationId: 'corr-500',
            url: '/tools/audit',
            type: 'crash',
        });
    });

    it('dispara actionTaken e navega no CTA principal do auth', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        const router = TestBed.inject(Router);
        const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
        const actionTakenSpy = jest.fn();

        fixture.componentInstance.type = 'auth';
        fixture.componentInstance.details = { message: 'Sessão inválida' } as unknown as Record<string, unknown>;
        fixture.componentInstance.actionTaken.subscribe(actionTakenSpy);

        fixture.detectChanges();

        const primaryButton = fixture.nativeElement.querySelector('.error-page__button--primary') as HTMLButtonElement;
        primaryButton.click();

        expect(actionTakenSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith('/login');
    });

    it('executa retry no estado crash usando details.url quando disponível', () => {
        const fixture = TestBed.createComponent(ErrorPageComponent);
        const router = TestBed.inject(Router);
        const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

        fixture.componentInstance.type = 'crash';
        fixture.componentInstance.details = {
            status: 500,
            url: '/tools/reports',
        } as unknown as Record<string, unknown>;

        fixture.detectChanges();

        const primaryButton = fixture.nativeElement.querySelector('.error-page__button--primary') as HTMLButtonElement;
        primaryButton.click();

        expect(navigateSpy).toHaveBeenCalledWith('/tools/reports');
    });
});
