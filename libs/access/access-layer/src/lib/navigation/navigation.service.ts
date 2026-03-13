/**
 * NavigationService
 * 
 * Facade do Access Layer para navegação segura.
 * Constrói e mantém árvore de menu/breadcrumbs a partir do ToolRegistry + AccessDecision,
 * reagindo a sessão/contexto/flags e eventos do Router.
 * 
 * Responsabilidades:
 * - Orquestrar builder+filter+resolvers
 * - Expor streams reativas: menu$, breadcrumbs$, activeItem$
 * - Reagir a mudanças de sessão/contexto/flags
 * - Reagir a eventos do Router (NavigationEnd)
 * - Prover snapshot() para render síncrono
 * - Prover rebuild() para forçar recomputação
 * 
 * Não-responsabilidades:
 * - NÃO faz HTTP (usa ToolRegistry/AccessDecision)
 * - NÃO contém lógica de autorização (delega para AccessDecision)
 * - NÃO define rotas (isso é RouterToolRoutes)
 */

import { Injectable, Inject, Optional, InjectionToken } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, merge } from 'rxjs';
import { ObservabilityService } from '@hub/observability';
import { 
  debounceTime, 
  distinctUntilChanged, 
  filter, 
  map, 
  shareReplay, 
  startWith 
} from 'rxjs/operators';

import { NavTree, NavItem, Breadcrumb, NavigationSnapshot } from './navigation.model';
import {
  buildNavigationTree, 
  IToolRegistryForNav, 
  NavigationBuildOptions 
} from './navigation.builder';
import { 
  filterNavigationTree, 
  IAccessDecisionServiceForNav, 
  IToolRegistryForFilter, 
  NavigationFilterOptions 
} from './navigation.filter';
import { 
  resolveBreadcrumbsSafe, 
  IToolRegistryForBreadcrumbs 
} from './navigation.breadcrumbs';
import { resolveActiveItemSafe } from './navigation.active';

/**
 * Interfaces mínimas para desacoplamento
 * (ISessionService e IContextService já definidos no tool-contract)
 */
export interface ISessionServiceForNav {
  isAuthenticated(): boolean;
  session$?: Observable<unknown>;
}

export interface IContextServiceForNav {
  getActiveContext(): unknown;
  contextChange$: Observable<unknown>;
}

/**
 * Tipo combinado de ToolRegistry (todas as interfaces)
 */
export type IToolRegistry = IToolRegistryForNav & IToolRegistryForFilter & IToolRegistryForBreadcrumbs;

/**
 * Injection tokens
 */
export const TOOL_REGISTRY_TOKEN = new InjectionToken<IToolRegistry>('TOOL_REGISTRY_TOKEN');
export const ACCESS_DECISION_TOKEN = new InjectionToken<IAccessDecisionServiceForNav>('ACCESS_DECISION_TOKEN');
export const SESSION_SERVICE_TOKEN = new InjectionToken<ISessionServiceForNav>('SESSION_SERVICE_TOKEN');
export const CONTEXT_SERVICE_TOKEN = new InjectionToken<IContextServiceForNav>('CONTEXT_SERVICE_TOKEN');
export const OBSERVABILITY_SERVICE_TOKEN = new InjectionToken<ObservabilityService>('OBSERVABILITY_SERVICE_TOKEN');

/**
 * NavigationService
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  /**
   * Streams privadas (fontes de dados)
   */
  private readonly rebuildTrigger$ = new BehaviorSubject<number>(0);
  private readonly currentUrl$ = new BehaviorSubject<string>('/');
  
  /**
   * Dependências (injetadas via Angular DI)
   */
  private readonly toolRegistry?: IToolRegistry;
  private readonly accessDecision?: IAccessDecisionServiceForNav;
  private readonly sessionService?: ISessionServiceForNav;
  private readonly contextService?: IContextServiceForNav;
  private readonly observability?: ObservabilityService;
  
  /**
   * Snapshot atual (estado síncrono)
   */
  private currentSnapshot: NavigationSnapshot = {
    menu: { groups: [], version: 0 },
    breadcrumbs: [],
    activeItem: null,
    timestamp: Date.now(),
  };
  
  /**
   * Stream do menu (árvore filtrada)
   */
  public readonly menu$: Observable<NavTree>;
  
  /**
   * Stream dos breadcrumbs (para rota atual)
   */
  public readonly breadcrumbs$: Observable<Breadcrumb[]>;
  
  /**
   * Stream do item ativo
   */
  public readonly activeItem$: Observable<NavItem | null>;
  
  constructor(
    private readonly router: Router,
    @Optional() @Inject(TOOL_REGISTRY_TOKEN) toolRegistry?: IToolRegistry,
    @Optional() @Inject(ACCESS_DECISION_TOKEN) accessDecision?: IAccessDecisionServiceForNav,
    @Optional() @Inject(SESSION_SERVICE_TOKEN) sessionService?: ISessionServiceForNav,
    @Optional() @Inject(CONTEXT_SERVICE_TOKEN) contextService?: IContextServiceForNav,
    @Optional() @Inject(OBSERVABILITY_SERVICE_TOKEN) observability?: ObservabilityService
  ) {
    // Atribuir dependências do DI
    this.toolRegistry = toolRegistry;
    this.accessDecision = accessDecision;
    this.sessionService = sessionService;
    this.contextService = contextService;
    this.observability = observability;
    
    // Validar dependências obrigatórias
    if (!this.toolRegistry) {
      console.warn('NavigationService: ToolRegistry não foi injetado. Menu ficará vazio.');
    }
    
    if (!this.accessDecision) {
      console.warn('NavigationService: AccessDecisionService não foi injetado. Filtro de acesso não será aplicado.');
    }
    
    // 1. Construir stream do menu
    // Recalcula quando: rebuild trigger, session change, context change
    this.menu$ = this.buildMenuStream();
    
    // 2. Construir stream de breadcrumbs
    // Recalcula quando: currentUrl change ou menu change
    this.breadcrumbs$ = this.buildBreadcrumbsStream();
    
    // 3. Construir stream do item ativo
    // Recalcula quando: currentUrl change ou menu change
    this.activeItem$ = this.buildActiveItemStream();
    
    // 4. Observar eventos de navegação do Router
    this.observeRouterEvents();
    
    // 5. Rebuild inicial
    this.rebuild();
  }
  
  /**
   * Configura as dependências manualmente (SOMENTE PARA TESTES)
   * Em produção, use Angular DI via InjectionTokens.
   */
  public configure(deps: {
    toolRegistry?: IToolRegistry;
    accessDecision?: IAccessDecisionServiceForNav;
    sessionService?: ISessionServiceForNav;
    contextService?: IContextServiceForNav;
    observability?: ObservabilityService;
  }): void {
    // Override apenas para testes
    // avoid `any` by casting through unknown to a writable shape
    (this as unknown as { toolRegistry?: IToolRegistry }).toolRegistry = deps.toolRegistry;
    (this as unknown as { accessDecision?: IAccessDecisionServiceForNav }).accessDecision = deps.accessDecision;
    (this as unknown as { sessionService?: ISessionServiceForNav }).sessionService = deps.sessionService;
    (this as unknown as { contextService?: IContextServiceForNav }).contextService = deps.contextService;
    (this as unknown as { observability?: ObservabilityService }).observability = deps.observability;

    // Rebuild após configurar
    this.rebuild();
  }
  
  /**
   * Força rebuild do menu/breadcrumbs/activeItem
   * Útil no bootstrap ou quando invalidar manualmente
   */
  public rebuild(): void {
    this.rebuildTrigger$.next(this.rebuildTrigger$.value + 1);
  }
  
  /**
   * Retorna snapshot atual (síncrono)
   * Útil para render inicial sem esperar stream
   */
  public snapshot(): NavigationSnapshot {
    return { ...this.currentSnapshot };
  }
  
  /**
   * Resolve navegação para URL específica (útil para deep links)
   */
  public resolveNavForUrl(url: string): { 
    item: NavItem | null; 
    breadcrumbs: Breadcrumb[]; 
  } {
    if (!this.toolRegistry) {
      return { item: null, breadcrumbs: [] };
    }
    
    const menu = this.currentSnapshot.menu;
    const breadcrumbs = resolveBreadcrumbsSafe(url, menu, this.toolRegistry);
    const item = resolveActiveItemSafe(url, menu);
    
    return { item, breadcrumbs };
  }
  
  /**
   * Constrói stream do menu
   */
  private buildMenuStream(): Observable<NavTree> {
    // Triggers de rebuild: manual, session change, context change
    const triggers$ = merge(
      this.rebuildTrigger$,
      this.sessionService?.session$ ?? [],
      this.contextService?.contextChange$ ?? []
    );
    
    return triggers$.pipe(
      // Debounce leve para evitar thrash (mudanças rápidas)
      debounceTime(50),
      // Construir menu
      map(() => this.buildMenu()),
      // Distinct até que a versão mude
      distinctUntilChanged((a, b) => a.version === b.version),
      // Compartilhar resultado (hot observable)
      shareReplay({ bufferSize: 1, refCount: true }),
      // Atualizar snapshot
      map((menu) => {
        this.currentSnapshot.menu = menu;
        this.currentSnapshot.timestamp = Date.now();
        return menu;
      })
    );
  }
  
  /**
   * Constrói stream de breadcrumbs
   */
  private buildBreadcrumbsStream(): Observable<Breadcrumb[]> {
    return combineLatest([
      this.currentUrl$,
      this.menu$.pipe(startWith(this.currentSnapshot.menu)),
    ]).pipe(
      map(([url, menu]) => this.buildBreadcrumbs(url, menu)),
      distinctUntilChanged((a, b) => this.breadcrumbsAreEqual(a, b)),
      shareReplay({ bufferSize: 1, refCount: true }),
      map((breadcrumbs) => {
        this.currentSnapshot.breadcrumbs = breadcrumbs;
        return breadcrumbs;
      })
    );
  }
  
  /**
   * Constrói stream do item ativo
   */
  private buildActiveItemStream(): Observable<NavItem | null> {
    return combineLatest([
      this.currentUrl$,
      this.menu$.pipe(startWith(this.currentSnapshot.menu)),
    ]).pipe(
      map(([url, menu]) => this.buildActiveItem(url, menu)),
      distinctUntilChanged((a, b) => a?.id === b?.id),
      shareReplay({ bufferSize: 1, refCount: true }),
      map((item) => {
        this.currentSnapshot.activeItem = item;
        return item;
      })
    );
  }
  
  /**
   * Observa eventos de navegação do Router
   */
  private observeRouterEvents(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        const newUrl = event.urlAfterRedirects || event.url;
        
        // Emitir evento de navegação mudada
        this.emitObservabilityEvent('nav.changed', { 
          url: this.sanitizeUrl(newUrl),
          fromUrl: this.sanitizeUrl(this.currentUrl$.value)
        });
        
        // Atualizar URL atual
        this.currentUrl$.next(newUrl);
      });
  }
  
  /**
   * Constrói menu (builder + filter)
   */
  private buildMenu(): NavTree {
    if (!this.toolRegistry) {
      return { groups: [], version: Date.now() };
    }
    
    // 1. Builder: construir árvore base
    const buildOptions: NavigationBuildOptions = {
      version: Date.now(),
    };
    
    const baseTree = buildNavigationTree(this.toolRegistry, buildOptions);
    
    // 2. Filter: aplicar decisões e status
    if (!this.accessDecision) {
      // Sem AccessDecision, retornar árvore base (sem filtro)
      this.emitObservabilityEvent('nav.built', { itemCount: this.countItems(baseTree), filtered: false });
      return baseTree;
    }
    
    const filterOptions: NavigationFilterOptions = {
      removeHidden: true,
      disableInaccessible: true,
      removeEmptyGroups: true,
      applyToolStatus: true,
    };
    
    const filteredTree = filterNavigationTree(
      baseTree,
      this.accessDecision,
      this.toolRegistry,
      filterOptions
    );
    
    // Emitir evento de navegação construída
    this.emitObservabilityEvent('nav.built', { 
      itemCount: this.countItems(filteredTree), 
      filtered: true,
      groupCount: filteredTree.groups.length
    });
    
    return filteredTree;
  }
  
  /**
   * Constrói breadcrumbs para URL
   */
  private buildBreadcrumbs(url: string, menu: NavTree): Breadcrumb[] {
    if (!this.toolRegistry) {
      return [{ label: 'Início', url: '/' }];
    }
    
    return resolveBreadcrumbsSafe(url, menu, this.toolRegistry);
  }
  
  /**
   * Constrói item ativo para URL
   */
  private buildActiveItem(url: string, menu: NavTree): NavItem | null {
    return resolveActiveItemSafe(url, menu);
  }

  /**
   * Compara dois arrays de breadcrumbs de forma otimizada
   * (Resolve P-001: evita JSON.stringify em distinctUntilChanged)
   */
  private breadcrumbsAreEqual(a: Breadcrumb[], b: Breadcrumb[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (a[i].label !== b[i].label || a[i].url !== b[i].url) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Emite evento de observabilidade (best-effort, sem PII)
   */
  private emitObservabilityEvent(name: string, properties: Record<string, unknown>): void {
    if (!this.observability) return;
    
    try {
      this.observability.trackEvent(name, properties);
    } catch (_e) {
      // Falha silenciosa - observability é opcional
      void _e
    }
  }

  /**
   * Sanitiza URL removendo parâmetros sensíveis
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url, 'http://localhost');
      // Remove query params que podem conter PII
      return urlObj.pathname;
    } catch {
      // Se falhar parsing, retornar apenas path básico
      return url.split('?')[0].split('#')[0];
    }
  }

  /**
   * Conta items no menu (para telemetria)
   */
  private countItems(tree: NavTree): number {
    let count = 0;
    for (const group of tree.groups) {
      count += group.items.length;
    }
    return count;
  }
}
