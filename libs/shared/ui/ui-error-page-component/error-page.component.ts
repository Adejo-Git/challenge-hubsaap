import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    InjectionToken,
    Input,
    inject,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
    ErrorPageDetails,
    ErrorPageAction,
    ErrorPageType,
    ErrorPageViewModel,
    resolveErrorPageViewModel,
} from './error-page.view-model';
import { UiIconsAssetsModule } from '../ui-icons-assets';

export interface TrackErrorPayload {
    code?: string;
    correlationId?: string;
    url: string;
    type: ErrorPageType;
}

export interface ObservabilityService {
    trackError(payload: TrackErrorPayload): void;
}

export const ERROR_PAGE_OBSERVABILITY = new InjectionToken<ObservabilityService>('ERROR_PAGE_OBSERVABILITY');

@Component({
    selector: 'hub-error-page',
    standalone: true,
    imports: [CommonModule, UiIconsAssetsModule],
    templateUrl: './error-page.component.html',
    styleUrls: ['./error-page.component.scss'],
})
export class ErrorPageComponent implements OnInit, AfterViewInit {
    private readonly router = inject(Router);
    private readonly observabilityService = inject(ERROR_PAGE_OBSERVABILITY, { optional: true });

    @Input() type: ErrorPageType = 'crash';
    @Input() details?: ErrorPageDetails;

    @Output() actionTaken = new EventEmitter<void>();

    @ViewChild('pageTitle') private pageTitle?: ElementRef<HTMLElement>;

    viewModel!: ErrorPageViewModel;

    ngOnInit(): void {
        this.viewModel = resolveErrorPageViewModel(this.type, this.details);
        this.trackError();
    }

    ngAfterViewInit(): void {
        this.pageTitle?.nativeElement.focus();
    }

    onPrimaryAction(): void {
        this.executeAction(this.viewModel.primaryCta);
        this.actionTaken.emit();
    }

    onSecondaryAction(): void {
        if (!this.viewModel.secondaryCta) {
            return;
        }

        this.executeAction(this.viewModel.secondaryCta);
    }

    private executeAction(action: ErrorPageAction): void {
        if (action.key === 'retry') {
            const retryUrl = this.details?.url || this.router.url || '/dashboard';
            void this.router.navigateByUrl(retryUrl);
            return;
        }

        if (action.navigateTo) {
            void this.router.navigateByUrl(action.navigateTo);
        }
    }

    private trackError(): void {
        if (!this.observabilityService) {
            return;
        }

        const code = this.details?.code ?? this.details?.status?.toString();
        const correlationId = this.details?.correlationId?.trim() || undefined;
        const url = this.details?.url || this.router.url;

        this.observabilityService.trackError({
            code,
            correlationId,
            url,
            type: this.type,
        });
    }
}
