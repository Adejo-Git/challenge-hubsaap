// libs/shared/ui/ui-feedback/components/ui-denied-state/ui-denied-state.component.ts

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FeedbackAction, UiMessage } from '../../ui-feedback.models';

@Component({
    selector: 'ui-denied-state',
    templateUrl: './ui-denied-state.component.html',
    styleUrls: ['./ui-denied-state.component.scss'],
})
export class UiDeniedStateComponent {
    @Input() message!: UiMessage;
    @Input() actions: FeedbackAction[] = [];

    @Output() actionClick = new EventEmitter<string>();

    onActionClick(action: FeedbackAction): void {
        this.actionClick.emit(action.handlerKey);
    }
}
