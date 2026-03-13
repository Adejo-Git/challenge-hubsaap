/**
 * Conteudos Page Component
 * Página de catálogo de conteúdos
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-conteudos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Conteúdos</h1>
      <p>Catálogo de conteúdos educacionais.</p>
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
export class ConteudosComponent {}

