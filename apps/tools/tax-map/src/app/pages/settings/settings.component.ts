/**
 * SettingsComponent
 * 
 * Página de configurações da tool.
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="settings-page">
      <h2>Configurações</h2>
      <p>Configurações da tool aqui.</p>
    </div>
  `,
  styles: [
    `
      .settings-page {
        padding: 2rem;
      }
    `,
  ],
})
export class SettingsComponent {}
