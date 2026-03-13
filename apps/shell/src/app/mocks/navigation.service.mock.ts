import { Injectable } from '@angular/core';
import { Observable, of, delay, BehaviorSubject } from 'rxjs';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  visible: boolean;
}

/**
 * NavigationServiceMock
 * 
 * Mock do NavigationService da Access Layer.
 * Simula a recuperação de árvore de navegação baseada em AccessDecision.
 * 
 * TODO: Substituir por @hub/access-layer/navigation quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationServiceMock {
  // Backing subjects so tests can spy on the getter `menu$` and emit values
  private readonly _menu$ = new BehaviorSubject<{ groups: unknown[] }>({ groups: [] });
  private readonly _breadcrumbs$ = new BehaviorSubject<unknown[]>([]);
  private readonly _activeItem$ = new BehaviorSubject<unknown | null>(null);

  /**
   * Getter spyable: `jest.spyOn(navigationService as any, 'menu$', 'get')`
   */
  public get menu$(): Observable<{ groups: unknown[] }> {
    return this._menu$.asObservable();
  }

  public get breadcrumbs$(): Observable<unknown[]> {
    return this._breadcrumbs$.asObservable();
  }

  public get activeItem$(): Observable<unknown | null> {
    return this._activeItem$.asObservable();
  }

  /**
   * Simula a recuperação da árvore de navegação.
   * Retorna menu mockado com itens visíveis baseados em permissões.
   */
  getNavigation(): Observable<NavigationItem[]> {
    const mockNavigation: NavigationItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'dashboard',
        visible: true,
      },
      {
        id: 'tools',
        label: 'Ferramentas',
        path: '/tools',
        icon: 'build',
        visible: true,
        children: [
          {
            id: 'tool-a',
            label: 'Ferramenta A',
            path: '/tools/tool-a',
            visible: true,
          },
          {
            id: 'tool-b',
            label: 'Ferramenta B',
            path: '/tools/tool-b',
            visible: true,
          },
        ],
      },
      {
        id: 'settings',
        label: 'Configurações',
        path: '/settings',
        icon: 'settings',
        visible: true,
      },
    ];

    // Emit the navigation into the backing subject so streams observing menu$ get updated
    this._menu$.next({ groups: mockNavigation });

    // Simula delay de rede (500ms)
    return of(mockNavigation).pipe(delay(500));
  }

  /**
   * Simula reconstrução de navegação (após troca de contexto).
   */
  rebuildNavigation(): Observable<NavigationItem[]> {
    console.log('[NavigationServiceMock] Reconstruindo navegação...');
    return this.getNavigation();
  }

  /**
   * Compatibilidade com NavigationService real: método de rebuild sem sufixo.
   */
  rebuild(): void {
    // Re-emit current navigation so subscribers react to rebuild
    const current = this._menu$.getValue();
    this._menu$.next(current);
  }

  navigateTo(path: string): void {
    console.log(`[NavigationServiceMock] Navegando para: ${path}`);
  }

  // Helpers para testes emitirem breadcrumbs/activeItem
  emitBreadcrumbs(crumbs: unknown[]): void {
    this._breadcrumbs$.next(crumbs);
  }

  emitActiveItem(item: unknown | null): void {
    this._activeItem$.next(item);
  }

  configure(_deps: unknown): void {
    void _deps;
  }

  resolveNavForUrl(_url: string): { item: unknown; breadcrumbs: unknown[] } {
    void _url;
    return { item: null, breadcrumbs: [] };
  }
}
