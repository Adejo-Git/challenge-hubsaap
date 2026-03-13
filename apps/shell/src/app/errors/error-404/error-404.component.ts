import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Error 404 Component
 * Exibido quando página/recurso não foi encontrado
 */
@Component({
  selector: 'hub-error-404',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-container">
      <h1>404 - Página não encontrada</h1>
      <p>O recurso que você está procurando não existe.</p>
      <a routerLink="/dashboard" class="btn btn-primary">Voltar ao Dashboard</a>
    </div>
  `,
  styles: [
    `
      .error-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
      }
    `,
  ],
})
export class Error404Component {}
