// libs/shared/ui/ui-feedback/components/ui-banner/ui-banner.component.ts

import { Component, Input } from '@angular/core';
import { FeedbackVariant, UiMessage } from '../../ui-feedback.models';

@Component({
    selector: 'ui-banner',
    templateUrl: './ui-banner.component.html',
    styleUrls: ['./ui-banner.component.scss'],
})
export class UiBannerComponent {
    @Input() variant: FeedbackVariant = 'info';
    @Input() message!: UiMessage;
}
