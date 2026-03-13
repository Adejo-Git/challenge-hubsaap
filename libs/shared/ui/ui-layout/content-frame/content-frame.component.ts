// src\app\lib\ui-layout\content-frame\content-frame.component.ts

import { Component, Input } from '@angular/core';

@Component({
    selector: 'ui-content-frame',
    standalone: false,
    templateUrl: './content-frame.component.html',
    styleUrls: ['./content-frame.component.scss'],
})
export class ContentFrameComponent {
    /**
     * Controla padding interno do conteúdo
     */
    @Input() padded = true;

    /**
     * Controla se o conteúdo deve rolar internamente
     */
    @Input() scrollable = true;
}
