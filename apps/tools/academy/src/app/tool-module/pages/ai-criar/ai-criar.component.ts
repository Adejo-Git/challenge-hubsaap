/**
 * AI Criar Page Component
 * Página de criação de conteúdo com IA
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'academy-ai-criar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Criar com IA</h1>
      <p>Ferramentas de criação de conteúdo assistidas por IA.</p>
      <p><strong>Feature Beta</strong> - <em>Implementação futura</em></p>
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
export class AiCriarComponent {}

