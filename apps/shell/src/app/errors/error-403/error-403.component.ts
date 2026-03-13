import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * Error 403 Component
 * Exibido quando usuário não tem permissão para acessar o recurso
 */
@Component({
  selector: 'hub-error-403',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="error-container">
      <h1>403 - Acesso Negado</h1>
      <p>Você não tem permissão para acessar esta página.</p>
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
export class Error403Component {}
