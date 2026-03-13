/**
 * DetailsComponent
 * 
 * Página de detalhes com parâmetro dinâmico (exemplo de rota com :id).
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="details-page">
      <h2>Detalhes</h2>
      <p>ID: {{ itemId }}</p>
      <p>Página de detalhes com parâmetro dinâmico.</p>
    </div>
  `,
  styles: [
    `
      .details-page {
        padding: 2rem;
      }
    `,
  ],
})
export class DetailsComponent implements OnInit {
  itemId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id');
  }
}
