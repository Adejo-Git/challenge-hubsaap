// src/app/lib/ui-layout/layout-shell/layout-shell.component.ts

import {
    Component,
    Input,
    ChangeDetectionStrategy
} from '@angular/core';

import { LayoutState } from '../ui-layout.model';

@Component({
    selector: 'ui-layout-shell',
    standalone: false,
    templateUrl: './layout-shell.component.html',
    styleUrls: ['./layout-shell.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutShellComponent {
    /**
     * Estado externo do layout.
     * O LayoutShell NÃO interpreta nem modifica esse estado.
     */
    @Input() state: LayoutState = {};
}
