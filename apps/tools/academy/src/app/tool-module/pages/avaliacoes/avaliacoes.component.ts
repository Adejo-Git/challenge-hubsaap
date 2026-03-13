/**
 * Avaliacoes Page Component
 * Página de sistema de avaliações
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-avaliacoes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Avaliações</h1>
      <p>Sistema de avaliações e testes de aprendizado.</p>
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
export class AvaliacoesComponent {}

