/**
 * Not Found Internal Page Component
 * Página de fallback 404 interno da tool
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
@Component({
  selector: 'academy-not-found-internal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Página não encontrada</h1>
      <p>A página que você está procurando não existe nesta ferramenta.</p>
      <button (click)="goBack()">Voltar</button>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      text-align: center;
    }
    h1 {
      margin-bottom: 1rem;
      color: #999;
    }
    button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
  `]
})
export class NotFoundInternalComponent {
  constructor(private router: Router) {}
  goBack(): void {
    this.router.navigate(['/tools/academy/overview']);
  }
}
