import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dashboard Component
 * Página inicial do Shell
 */
@Component({
  selector: 'hub-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      <p>Bem-vindo ao Hub-Saap!</p>
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        padding: 2rem;
      }
    `,
  ],
})
export class DashboardComponent {}
