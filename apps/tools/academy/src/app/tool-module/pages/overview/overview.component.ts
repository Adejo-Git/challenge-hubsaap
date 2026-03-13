/**
 * Overview Page Component
 * Página de visão geral da Academy
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Academy - Visão Geral</h1>
      <p>Página de visão geral da plataforma Academy.</p>
      <p><em>Placeholder - implementação futura</em></p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
    h1 {
      margin-bottom: 1rem;
    }
  `]
})
export class OverviewComponent {}

