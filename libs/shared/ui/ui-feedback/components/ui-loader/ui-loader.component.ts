// libs/shared/ui/ui-feedback/components/ui-loader/ui-loader.component.ts

import { Component, Input } from '@angular/core';

@Component({
    selector: 'ui-loader',
    templateUrl: './ui-loader.component.html',
    styleUrls: ['./ui-loader.component.scss'],
})
export class UiLoaderComponent {
    @Input({ required: true }) label!: string;
}
