// src\app\lib\ui-layout\topbar\topbar.component.ts

import { Component, Input } from '@angular/core';

@Component({
    selector: 'ui-topbar',
    standalone: false,
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent {
    /**
     * Topbar fixa no topo
     */
    @Input() sticky = true;
}
