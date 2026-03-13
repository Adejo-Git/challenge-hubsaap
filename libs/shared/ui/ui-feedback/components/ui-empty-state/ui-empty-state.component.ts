// libs/shared/ui/ui-feedback/components/ui-empty-state/ui-empty-state.component.ts

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FeedbackAction, UiMessage } from '../../ui-feedback.models';

@Component({
    selector: 'ui-empty-state',
    templateUrl: './ui-empty-state.component.html',
    styleUrls: ['./ui-empty-state.component.scss'],
})
export class UiEmptyStateComponent {
    private static nextTitleId = 0;

    @Input() message!: UiMessage;
    @Input() icon?: string;
    @Input() actions: FeedbackAction[] = [];
    @Input() titleId = `ui-empty-state-title-${UiEmptyStateComponent.nextTitleId++}`;

    @Output() actionClick = new EventEmitter<string>();

    onActionClick(action: FeedbackAction): void {
        this.actionClick.emit(action.handlerKey);
    }
}
