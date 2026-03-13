// src\app\lib\ui-layout\ui-layout.module.ts

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LayoutShellComponent } from './layout-shell/layout-shell.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { ContentFrameComponent } from './content-frame/content-frame.component';

@NgModule({
    declarations: [
        LayoutShellComponent,
        SidebarComponent,
        TopbarComponent,
        RightPanelComponent,
        ContentFrameComponent,
    ],
    imports: [
        CommonModule,
    ],
    exports: [
        LayoutShellComponent,
        SidebarComponent,
        TopbarComponent,
        RightPanelComponent,
        ContentFrameComponent,
    ],
})
export class UiLayoutModule { }
