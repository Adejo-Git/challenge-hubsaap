import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'hub-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 2rem;">
      <h1>Dashboard</h1>
      <p>Bem-vindo ao Hub-Saap!</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class DashboardComponent {}
