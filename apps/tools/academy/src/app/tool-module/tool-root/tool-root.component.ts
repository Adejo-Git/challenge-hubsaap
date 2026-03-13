/**
 * Academy Tool Root Component
 *
 * Container principal da tool Academy.
 * Renderiza router-outlet para navegação interna.
 *
 * Responsabilidades:
 * - Ser o container principal (raiz) da tool
 * - Renderizar router-outlet para páginas internas
 * - Standalone component (sem NgModule próprio)
 *
 * NÃO deve:
 * - Implementar lógica de negócio
 * - Fazer IO direto
 * - Duplicar layout global do Shell
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'academy-tool-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './tool-root.component.html',
  styleUrls: ['./tool-root.component.scss'],
})
export class ToolRootComponent {
  constructor() {
    // Container principal - lógica mínima
  }
}

