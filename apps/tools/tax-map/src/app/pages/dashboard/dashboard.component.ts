/**
 * DashboardComponent
 * 
 * Página de dashboard da tool.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <h2>Dashboard</h2>
      <p>Conteúdo do dashboard aqui.</p>
    </div>
  `,
  styles: [
    `
      .dashboard-page {
        padding: 2rem;
      }
    `,
  ],
})
export class DashboardComponent {}
