import { Component } from '@angular/core';
import { AppShellComponent } from './shell/app-shell/app-shell.component';

@Component({
  standalone: true,
  imports: [AppShellComponent],
  selector: 'hub-root',
  template: '<hub-app-shell></hub-app-shell>',
})
export class AppComponent {}
