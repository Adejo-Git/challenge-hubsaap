// libs/shared/ui/ui-feedback/components/ui-skeleton/ui-skeleton.component.ts

import { Component, Input } from '@angular/core';

@Component({
    selector: 'ui-skeleton',
    templateUrl: './ui-skeleton.component.html',
    styleUrls: ['./ui-skeleton.component.scss'],
})
export class UiSkeletonComponent {
    @Input() lines = 3;
}
