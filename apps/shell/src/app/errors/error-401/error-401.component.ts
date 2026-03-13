import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Error 401 Component
 * Exibido quando usuário não está autenticado
 */
@Component({
  selector: 'hub-error-401',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-container">
      <h1>401 - Não Autorizado</h1>
      <p>Você precisa estar autenticado para acessar esta página.</p>
      <a routerLink="/login" class="btn btn-primary">Ir para Login</a>
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
export class Error401Component {}
