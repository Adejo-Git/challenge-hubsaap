// libs/shared/ui/ui-feedback/components/ui-error-state/ui-error-state.component.ts

import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
} from '@angular/core';
import { FeedbackAction, UiMessage } from '../../ui-feedback.models';

@Component({
    selector: 'ui-error-state',
    templateUrl: './ui-error-state.component.html',
    styleUrls: ['./ui-error-state.component.scss'],
})
export class UiErrorStateComponent implements AfterViewInit {
    @Input() message!: UiMessage;
    @Input() actions: FeedbackAction[] = [];
    @Input() autoFocus = false;
    @Input() showCorrelation = false;

    @Output() actionClick = new EventEmitter<string>();

    @ViewChild('errorContainer') private errorContainer?: ElementRef<HTMLElement>;

    onActionClick(action: FeedbackAction): void {
        this.actionClick.emit(action.handlerKey);
    }

    ngAfterViewInit(): void {
        if (this.autoFocus) {
            this.errorContainer?.nativeElement.focus();
        }
    }
}
