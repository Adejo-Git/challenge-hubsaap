/**
 * NotFoundInternalComponent
 * 
 * Fallback interno da tool para rotas não encontradas.
 * Não confundir com 404 global do Hub.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-internal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found-page">
      <div class="error-content">
        <h2>Página não encontrada</h2>
        <p>
          A página que você tentou acessar não existe dentro desta ferramenta.
        </p>
        <a routerLink="/tools/tax-map/home" class="btn-home">
          Voltar para o início
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .not-found-page {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 2rem;
      }

      .error-content {
        text-align: center;
        max-width: 500px;
      }

      .error-content h2 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 1rem;
        color: #ef4444;
      }

      .error-content p {
        margin-bottom: 2rem;
        color: #6b7280;
      }

      .btn-home {
        display: inline-block;
        padding: 0.75rem 1.5rem;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 0.375rem;
        font-weight: 500;
      }

      .btn-home:hover {
        background-color: #2563eb;
      }
    `,
  ],
})
export class NotFoundInternalComponent {}
