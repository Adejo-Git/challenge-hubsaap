/**
 * Item Page Component
 * Página de visualização de item individual
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'academy-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h1>Item</h1>
      <p>Visualização de item individual.</p>
      <p><em>ID: {{ itemId || 'N/A' }}</em></p>
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
export class ItemComponent {
  itemId: string | null = null;

  constructor(private route: ActivatedRoute) {
    this.itemId = this.route.snapshot.paramMap.get('id');
  }
}

