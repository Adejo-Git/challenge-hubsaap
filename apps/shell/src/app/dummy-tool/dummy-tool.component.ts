import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dummy Tool Component
 * Placeholder para uma tool carregada via lazy route
 * Em produção, seria substituído pelo ToolRoot ou ToolModule real
 */
@Component({
  selector: 'hub-dummy-tool',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tool-container">
      <h2>Ferramenta Carregada via Lazy Route</h2>
      <p>Este é um placeholder para uma tool real.</p>
    </div>
  `,
  styles: [
    `
      .tool-container {
        padding: 2rem;
      }
    `,
  ],
})
export class DummyToolComponent {}
