/**
 * Biblioteca Page Component
 * Página de biblioteca de recursos
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-biblioteca',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Biblioteca</h1>
      <p>Biblioteca de recursos educacionais.</p>
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
export class BibliotecaComponent {}

