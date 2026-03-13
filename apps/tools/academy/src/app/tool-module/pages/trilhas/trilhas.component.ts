/**
 * Trilhas Page Component
 * Página de trilhas de aprendizado
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-trilhas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Trilhas de Aprendizado</h1>
      <p>Navegação e gestão de trilhas de aprendizado.</p>
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
export class TrilhasComponent {}

