/**
 * HomeComponent
 * 
 * Página inicial da tool (rota default).
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-page">
      <h2>Bem-vindo à Example Tool</h2>
      <p>Esta é a página inicial da tool.</p>

      <nav class="internal-nav">
        <a routerLink="/tools/tax-map/dashboard">Ir para Dashboard</a>
        <a routerLink="/tools/tax-map/settings">Ir para Configurações</a>
      </nav>
    </div>
  `,
  styles: [
    `
      .home-page {
        padding: 2rem;
      }

      .internal-nav {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
      }

      .internal-nav a {
        padding: 0.5rem 1rem;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 0.25rem;
      }

      .internal-nav a:hover {
        background-color: #2563eb;
      }
    `,
  ],
})
export class HomeComponent {}
