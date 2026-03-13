/**
 * NavigationService Consolidated Tests
 * 
 * Testes consolidados cobrindo TODOS os módulos de navegação conforme spec:
 * - NavigationService (facade): Build+filter, Context change, Breadcrumbs, Active item
 * - navigation.util: funções utilitárias
 * - navigation.builder: construção da árvore
 * - navigation.filter: filtragem por decisão e status
 * - navigation.breadcrumbs: resolução de breadcrumbs
 * - navigation.active: resolução de item ativo
 */

import { Subject, BehaviorSubject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';

import { TestBed } from '../../__mocks__/@angular/core/testing';

import {
  NavigationService,
  IToolRegistry,
  ISessionServiceForNav,
  IContextServiceForNav,
  TOOL_REGISTRY_TOKEN,
  ACCESS_DECISION_TOKEN,
  SESSION_SERVICE_TOKEN,
  CONTEXT_SERVICE_TOKEN,
} from './navigation.service';
import { NavTree, NavItem } from './navigation.model';
import {
  normalizeUrl,
  generateNavItemId,
  generateNavGroupId,
  matchesNavItem,
  extractToolKeyFromUrl,
  isToolRoute,
  createNavMeta,
} from './navigation.util';
import {
  buildNavigationTree,
  IToolRegistryForNav,
  ToolManifestLite,
} from './navigation.builder';
import {
  filterNavigationTree,
  IAccessDecisionServiceForNav,
  IToolRegistryForFilter,
  DecisionTarget,
  ToolStatus,
} from './navigation.filter';
import {
  resolveBreadcrumbs,
  IToolRegistryForBreadcrumbs,
} from './navigation.breadcrumbs';
import {
  resolveActiveItem,
} from './navigation.active';

/**
 * ===================================================================
 * MOCKS
 * ===================================================================
 */

/**
 * Mock ToolRegistry (completo: builder + breadcrumbs + filter)
 */
class MockToolRegistry implements 
  IToolRegistryForNav,
  IToolRegistryForBreadcrumbs,
  IToolRegistryForFilter
{
  private tools: ToolManifestLite[] = [
    {
      toolKey: 'financeiro',
      title: 'Financeiro',
      baseRoute: '/tools/financeiro',
      icon: 'money',
      group: 'tools',
      order: 1,
    },
    {
      toolKey: 'rh',
      title: 'Recursos Humanos',
      baseRoute: '/tools/rh',
      icon: 'people',
      group: 'tools',
      order: 2,
    },
    {
      toolKey: 'crm',
      title: 'CRM',
      baseRoute: '/tools/crm',
      icon: 'users',
      group: 'tools',
      order: 3,
    },
  ];
  
  listTools(): ToolManifestLite[] {
    return [...this.tools];
  }
  
  getTool(toolKey: string): ToolManifestLite | null {
    return this.tools.find((t) => t.toolKey === toolKey) ?? null;
  }
  
  status(toolKey: string): ToolStatus {
    const tool = this.getTool(toolKey);
    return {
      installed: !!tool,
      enabled: !!tool,
    };
  }
}

/**
 * Mock AccessDecisionService
 */
class MockAccessDecisionService implements IAccessDecisionServiceForNav {
  private deniedTargets = new Set<string>();
  
  canView(target: DecisionTarget): boolean {
    const key = `${target.type}:${target.key}`;
    return !this.deniedTargets.has(key);
  }
  
  canEnter(target: DecisionTarget): boolean {
    return this.canView(target);
  }
  
  denyAccess(type: string, key: string): void {
    this.deniedTargets.add(`${type}:${key}`);
  }
  
  allowAccess(type: string, key: string): void {
    this.deniedTargets.delete(`${type}:${key}`);
  }
}

/**
 * Mock Router
 */
class MockRouter {
  private eventsSubject = new Subject<NavigationEnd>();
  public events = this.eventsSubject.asObservable();
  
  simulateNavigation(url: string): void {
    this.eventsSubject.next(
      new NavigationEnd(1, url, url)
    );
  }
}

/**
 * Mock SessionService
 */
class MockSessionService {
  public session$ = new BehaviorSubject<{ authenticated: boolean }>({ authenticated: true });
  
  isAuthenticated(): boolean {
    return this.session$.value.authenticated;
  }
}

/**
 * Mock ContextService
 */
class MockContextService {
  public contextChange$ = new Subject<{ tenantId: string }>();
  
  getActiveContext() {
    return { tenantId: 'tenant1' };
  }
  
  changeContext(tenantId: string): void {
    this.contextChange$.next({ tenantId });
  }
}

/**
 * ===================================================================
 * NAVIGATION SERVICE TESTS (Facade Integration)
 * ===================================================================
 */

describe('NavigationService', () => {
  let service: NavigationService;
  let mockToolRegistry: MockToolRegistry;
  let mockAccessDecision: MockAccessDecisionService;
  let mockRouter: MockRouter;
  let mockSessionService: MockSessionService;
  let mockContextService: MockContextService;

  beforeEach(() => {
    mockToolRegistry = new MockToolRegistry();
    mockAccessDecision = new MockAccessDecisionService();
    mockRouter = new MockRouter();
    mockSessionService = new MockSessionService();
    mockContextService = new MockContextService();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: mockRouter as unknown as Router,
        },
        {
          provide: TOOL_REGISTRY_TOKEN,
          useValue: mockToolRegistry as unknown as IToolRegistry,
        },
        {
          provide: ACCESS_DECISION_TOKEN,
          useValue: mockAccessDecision,
        },
        {
          provide: SESSION_SERVICE_TOKEN,
          useValue: mockSessionService as unknown as ISessionServiceForNav,
        },
        {
          provide: CONTEXT_SERVICE_TOKEN,
          useValue: mockContextService as unknown as IContextServiceForNav,
        },
        NavigationService,
      ],
    });

    service = TestBed.inject(NavigationService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Build + Filter (Determinismo)', () => {
    it('deve construir menu com tools do registry', (done) => {
      service.menu$.subscribe((menu) => {
        expect(menu).toBeDefined();
        expect(menu.groups.length).toBeGreaterThan(0);
        
        const allItems = menu.groups.flatMap((g) => g.items);
        const financeiroItem = allItems.find((i) => i.toolKey === 'financeiro');
        const rhItem = allItems.find((i) => i.toolKey === 'rh');
        
        expect(financeiroItem).toBeDefined();
        expect(rhItem).toBeDefined();
        
        done();
      });
    });
    
    it('deve produzir o mesmo menu para mesma entrada (determinismo)', (done) => {
      let firstMenu: NavTree;
      
      service.menu$.subscribe((menu) => {
        if (!firstMenu) {
          firstMenu = menu;
          service.rebuild();
        } else {
          const firstGroups = firstMenu.groups.map((g) => ({
            id: g.id,
            items: g.items.map((i) => i.id),
          }));
          
          const secondGroups = menu.groups.map((g) => ({
            id: g.id,
            items: g.items.map((i) => i.id),
          }));
          
          expect(JSON.stringify(firstGroups)).toBe(JSON.stringify(secondGroups));
          done();
        }
      });
    });
    
    it('deve filtrar itens negados pelo AccessDecision', (done) => {
      mockAccessDecision.denyAccess('tool', 'rh');
      service.rebuild();
      
      service.menu$.subscribe((menu) => {
        const allItems = menu.groups.flatMap((g) => g.items);
        const rhItem = allItems.find((i) => i.toolKey === 'rh');
        
        expect(rhItem).toBeUndefined();
        
        const financeiroItem = allItems.find((i) => i.toolKey === 'financeiro');
        expect(financeiroItem).toBeDefined();
        
        done();
      });
    });
  });
  
  describe('Context Change Rebuild', () => {
    it('deve reconstruir menu quando contexto mudar', (done) => {
      let initialVersion: number | undefined;
      let callCount = 0;
      
      const subscription = service.menu$.subscribe((menu) => {
        callCount++;
        
        if (callCount === 1) {
          initialVersion = menu.version;
          
          setTimeout(() => {
            mockContextService.changeContext('tenant2');
            
            setTimeout(() => {
              service.rebuild();
              
              setTimeout(() => {
                const snapshot = service.snapshot();
                if (snapshot.menu.version > (initialVersion ?? 0)) {
                  subscription.unsubscribe();
                  done();
                } else {
                  done.fail('Menu version did not change after context change');
                }
              }, 200);
            }, 100);
          }, 100);
        }
      });
    }, 15000);
  });
  
  describe('Breadcrumbs para /tools/<toolKey>', () => {
    it('deve gerar breadcrumbs corretos para tool root', (done) => {
      mockRouter.simulateNavigation('/tools/financeiro');
      
      service.breadcrumbs$.subscribe((breadcrumbs) => {
        expect(breadcrumbs.length).toBeGreaterThanOrEqual(2);
        
        expect(breadcrumbs[0].label).toBe('Início');
        expect(breadcrumbs[0].url).toBe('/');
        
        const toolBreadcrumb = breadcrumbs.find((b) => b.toolKey === 'financeiro');
        expect(toolBreadcrumb).toBeDefined();
        expect(toolBreadcrumb?.label).toBe('Financeiro');
        
        done();
      });
    });
    
    it('deve gerar breadcrumbs corretos para subpath de tool', (done) => {
      mockRouter.simulateNavigation('/tools/financeiro/invoices');
      
      service.breadcrumbs$.subscribe((breadcrumbs) => {
        expect(breadcrumbs.length).toBeGreaterThanOrEqual(3);
        
        expect(breadcrumbs[0].label).toBe('Início');
        
        const toolBreadcrumb = breadcrumbs.find((b) => b.toolKey === 'financeiro');
        expect(toolBreadcrumb).toBeDefined();
        
        const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
        expect(lastBreadcrumb.isActive).toBe(true);
        
        done();
      });
    });
    
    it('deve retornar breadcrumbs mínimos para toolKey desconhecido', (done) => {
      mockRouter.simulateNavigation('/tools/unknown-tool');
      
      service.breadcrumbs$.subscribe((breadcrumbs) => {
        expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);
        expect(breadcrumbs[0].label).toBe('Início');
        
        done();
      });
    });
  });
  
  describe('Active Item para /tools/<toolKey>', () => {
    it('deve resolver activeItem correto para tool root', (done) => {
      let emissionCount = 0;
      service.activeItem$.subscribe((item) => {
        emissionCount++;
        if (emissionCount > 1 && item?.toolKey === 'financeiro') {
          expect(item).toBeDefined();
          expect(item?.toolKey).toBe('financeiro');
          expect(item?.label).toBe('Financeiro');
          done();
        }
      });
      
      mockRouter.simulateNavigation('/tools/financeiro');
    });
    
    it('deve resolver activeItem correto para subpath de tool', (done) => {
      let emissionCount = 0;
      service.activeItem$.subscribe((item) => {
        emissionCount++;
        if (emissionCount > 1 && item?.toolKey === 'financeiro') {
          expect(item).toBeDefined();
          expect(item?.toolKey).toBe('financeiro');
          done();
        }
      });
      
      mockRouter.simulateNavigation('/tools/financeiro/invoices');
    });
    
    it('deve retornar null para toolKey desconhecido', (done) => {
      mockRouter.simulateNavigation('/tools/unknown-tool');
      
      service.activeItem$.subscribe((item) => {
        expect(item).toBeNull();
        done();
      });
    });
  });
  
  describe('Snapshot', () => {
    it('deve retornar snapshot síncrono do estado atual', () => {
      const snapshot = service.snapshot();
      
      expect(snapshot).toBeDefined();
      expect(snapshot.menu).toBeDefined();
      expect(snapshot.breadcrumbs).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });
  });
  
  describe('resolveNavForUrl', () => {
    it('deve resolver navegação para URL específica', (done) => {
      service.menu$.subscribe((menu) => {
        if (menu.groups.length > 0) {
          const result = service.resolveNavForUrl('/tools/financeiro');
          
          expect(result).toBeDefined();
          expect(result.item).toBeDefined();
          expect(result.item?.toolKey).toBe('financeiro');
          expect(result.breadcrumbs.length).toBeGreaterThan(0);
          done();
        }
      });
    });
  });
});

/**
 * ===================================================================
 * NAVIGATION.UTIL TESTS (Unit Tests)
 * ===================================================================
 */

describe('NavigationUtil', () => {
  
  describe('normalizeUrl', () => {
    it('should normalize URL removing query string and hash', () => {
      expect(normalizeUrl('/tools/financeiro?tab=invoices#section')).toBe('/tools/financeiro');
    });

    it('should remove trailing slash except for root', () => {
      expect(normalizeUrl('/tools/financeiro/')).toBe('/tools/financeiro');
      expect(normalizeUrl('/')).toBe('/');
    });

    it('should lowercase URL for case-insensitive matching', () => {
      expect(normalizeUrl('/Tools/Financeiro')).toBe('/tools/financeiro');
    });

    it('should handle empty/null URLs', () => {
      expect(normalizeUrl('')).toBe('/');
      expect(normalizeUrl(null as unknown as string)).toBe('/');
    });

    it('should trim whitespace', () => {
      expect(normalizeUrl('  /tools/financeiro  ')).toBe('/tools/financeiro');
    });
  });

  describe('generateNavItemId', () => {
    it('should generate ID from toolKey (highest priority)', () => {
      const item: Partial<NavItem> = {
        toolKey: 'financeiro',
        routeKey: 'some-route',
        url: '/tools/financeiro',
        label: 'Financeiro',
      };
      expect(generateNavItemId(item)).toBe('nav-tool-financeiro');
    });

    it('should generate ID from routeKey when no toolKey', () => {
      const item: Partial<NavItem> = {
        routeKey: 'dashboard',
        url: '/dashboard',
        label: 'Dashboard',
      };
      expect(generateNavItemId(item)).toBe('nav-route-dashboard');
    });

    it('should generate ID from URL when no toolKey/routeKey', () => {
      const item: Partial<NavItem> = {
        url: '/admin/users',
        label: 'Users',
      };
      expect(generateNavItemId(item)).toBe('nav-url--admin-users');
    });

    it('should generate ID from label when no other key', () => {
      const item: Partial<NavItem> = {
        label: 'Settings Page',
      };
      expect(generateNavItemId(item)).toBe('nav-label-settings-page');
    });
  });

  describe('generateNavGroupId', () => {
    it('should generate ID from label', () => {
      const group = { label: 'Administração', order: 100 };
      expect(generateNavGroupId(group)).toBe('nav-group-administra-o');
    });

    it('should generate ID from order when no label', () => {
      const group = { order: 100 };
      expect(generateNavGroupId(group)).toBe('nav-group-100');
    });
  });

  describe('matchesNavItem', () => {
    const item: NavItem = {
      id: 'nav-tool-financeiro',
      label: 'Financeiro',
      type: 'link',
      url: '/tools/financeiro',
      toolKey: 'financeiro',
      icon: 'wallet',
      disabled: false,
    };

    it('should match exact URL after normalization', () => {
      expect(matchesNavItem('/tools/financeiro', item)).toBe(true);
      expect(matchesNavItem('/tools/financeiro/', item)).toBe(true);
      expect(matchesNavItem('/Tools/Financeiro', item)).toBe(true);
    });

    it('should match subpaths (prefix matching)', () => {
      expect(matchesNavItem('/tools/financeiro/invoices', item)).toBe(true);
      expect(matchesNavItem('/tools/financeiro/dashboard', item)).toBe(true);
    });

    it('should not match similar but different URLs', () => {
      expect(matchesNavItem('/tools/financeiro-novo', item)).toBe(false);
      expect(matchesNavItem('/tools/finance', item)).toBe(false);
    });

    it('should not match if item has no URL', () => {
      const itemNoUrl = { ...item, url: undefined };
      expect(matchesNavItem('/tools/financeiro', itemNoUrl as unknown as NavItem)).toBe(false);
    });
  });

  describe('extractToolKeyFromUrl', () => {
    it('should extract toolKey from /tools/<toolKey>', () => {
      expect(extractToolKeyFromUrl('/tools/financeiro')).toBe('financeiro');
    });

    it('should extract toolKey from /tools/<toolKey>/subpath', () => {
      expect(extractToolKeyFromUrl('/tools/financeiro/invoices')).toBe('financeiro');
    });

    it('should return null for non-tool routes', () => {
      expect(extractToolKeyFromUrl('/dashboard')).toBeNull();
      expect(extractToolKeyFromUrl('/admin/users')).toBeNull();
    });

    it('should handle case insensitive', () => {
      expect(extractToolKeyFromUrl('/Tools/Financeiro')).toBe('financeiro');
    });

    it('should handle trailing slashes', () => {
      expect(extractToolKeyFromUrl('/tools/financeiro/')).toBe('financeiro');
    });
  });

  describe('isToolRoute', () => {
    it('should return true for tool routes', () => {
      expect(isToolRoute('/tools/financeiro')).toBe(true);
      expect(isToolRoute('/tools/crm/dashboard')).toBe(true);
    });

    it('should return false for non-tool routes', () => {
      expect(isToolRoute('/dashboard')).toBe(false);
      expect(isToolRoute('/admin')).toBe(false);
    });
  });

  describe('createNavMeta', () => {
    it('should create NavMeta from NavItem', () => {
      const item: NavItem = {
        id: 'nav-tool-financeiro',
        label: 'Financeiro',
        type: 'link',
        url: '/tools/financeiro',
        toolKey: 'financeiro',
        routeKey: 'financeiro-dashboard',
        icon: 'wallet',
        disabled: false,
      };

      const meta = createNavMeta(item);

      expect(meta.toolKey).toBe('financeiro');
      expect(meta.routeKey).toBe('financeiro-dashboard');
      expect(meta.url).toBe('/tools/financeiro');
      expect(meta.title).toBe('Financeiro');
      expect(meta.depth).toBe(0);
      expect(meta.parent).toBeUndefined();
    });
  });
});

/**
 * ===================================================================
 * NAVIGATION.BUILDER TESTS (Unit Tests)
 * ===================================================================
 */

describe('NavigationBuilder', () => {
  let mockToolRegistry: MockToolRegistry;

  beforeEach(() => {
    mockToolRegistry = new MockToolRegistry();
  });

  describe('buildNavigationTree', () => {
    it('should build tree with tools from registry', () => {
      const tree = buildNavigationTree(mockToolRegistry);

      expect(tree).toBeDefined();
      expect(tree.groups).toBeDefined();
      expect(tree.groups.length).toBeGreaterThan(0);
    });

    it('should include tools in tree when includeTools=true', () => {
      const tree = buildNavigationTree(mockToolRegistry, { includeTools: true });

      const toolsGroup = tree.groups.find((g) => g.id === 'nav-group-tools' || g.label === 'Ferramentas');
      expect(toolsGroup).toBeDefined();
      
      if (toolsGroup) {
        const financeiroItem = toolsGroup.items.find((i) => i.toolKey === 'financeiro');
        expect(financeiroItem).toBeDefined();
        expect(financeiroItem?.label).toBe('Financeiro');
      }
    });

    it('should exclude tools when includeTools=false', () => {
      const tree = buildNavigationTree(mockToolRegistry, { includeTools: false });

      const allItems = tree.groups.flatMap((g) => g.items);
      const toolItems = allItems.filter((i) => i.toolKey);
      
      expect(toolItems).toHaveLength(0);
    });

    it('should sort items by order field', () => {
      const tree = buildNavigationTree(mockToolRegistry);

      const toolsGroup = tree.groups.find((g) => g.id === 'nav-group-tools' || g.label === 'Ferramentas');

      if (toolsGroup && toolsGroup.items.length >= 2) {
        const orders = toolsGroup.items
          .filter((i): i is NavItem & { order: number } => typeof i.order === 'number')
          .map((i) => i.order);

        for (let i = 1; i < orders.length; i++) {
          expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
        }
      }
    });

    it('should generate stable IDs for determinism', () => {
      const tree1 = buildNavigationTree(mockToolRegistry);
      const tree2 = buildNavigationTree(mockToolRegistry);

      const ids1 = tree1.groups.flatMap((g) => g.items.map((i) => i.id)).sort();
      const ids2 = tree2.groups.flatMap((g) => g.items.map((i) => i.id)).sort();

      expect(ids1).toEqual(ids2);
    });

    it('should produce same tree for same input (determinismo)', () => {
      const tree1 = buildNavigationTree(mockToolRegistry);
      const tree2 = buildNavigationTree(mockToolRegistry);

      expect(tree1.groups.length).toBe(tree2.groups.length);
      expect(tree1.meta?.totalItems).toBe(tree2.meta?.totalItems);
    });
  });
});

/**
 * ===================================================================
 * NAVIGATION.FILTER TESTS (Unit Tests)
 * ===================================================================
 */

describe('NavigationFilter', () => {
  let mockAccessDecision: MockAccessDecisionService;
  let mockToolRegistry: MockToolRegistry;
  let baseTree: NavTree;

  beforeEach(() => {
    mockAccessDecision = new MockAccessDecisionService();
    mockToolRegistry = new MockToolRegistry();

    baseTree = {
      groups: [
        {
          id: 'nav-group-tools',
          label: 'Ferramentas',
          order: 100,
          items: [
            {
              id: 'nav-tool-financeiro',
              label: 'Financeiro',
              type: 'link',
              url: '/tools/financeiro',
              toolKey: 'financeiro',
              icon: 'wallet',
              disabled: false,
            },
            {
              id: 'nav-tool-crm',
              label: 'CRM',
              type: 'link',
              url: '/tools/crm',
              toolKey: 'crm',
              icon: 'users',
              disabled: false,
            },
          ],
        },
      ],
      meta: {
        totalItems: 2,
        generatedAt: new Date().getTime(),
      },
      version: 1,
    };
  });

  describe('filterNavigationTree', () => {
    it('should return filtered tree with accessible items', () => {
      const filtered = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry);

      expect(filtered).toBeDefined();
      expect(filtered.groups).toBeDefined();
      expect(filtered.groups.length).toBeGreaterThan(0);
    });

    it('should remove items when canView=false', () => {
      mockAccessDecision.canView = jest.fn((target: DecisionTarget) => {
        return target.key !== 'crm';
      });

      const filtered = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry);

      const toolsGroup = filtered.groups.find((g) => g.id === 'nav-group-tools');
      expect(toolsGroup).toBeDefined();

      if (toolsGroup) {
        const crmItem = toolsGroup.items.find((i) => i.toolKey === 'crm');
        expect(crmItem).toBeUndefined();

        const financeiroItem = toolsGroup.items.find((i) => i.toolKey === 'financeiro');
        expect(financeiroItem).toBeDefined();
      }
    });

    it('should remove empty groups after filtering', () => {
      mockAccessDecision.canView = jest.fn(() => false);

      const filtered = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry, {
        removeEmptyGroups: true,
      });

      expect(filtered.groups).toHaveLength(0);
    });

    it('should update metadata after filtering', () => {
      mockAccessDecision.canView = jest.fn((target: DecisionTarget) => {
        return target.key !== 'crm';
      });

      const filtered = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry);

      expect(filtered.meta?.totalItems).toBe(1);
    });

    it('should produce same filtered tree for same input (determinismo)', () => {
      const filtered1 = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry);
      const filtered2 = filterNavigationTree(baseTree, mockAccessDecision, mockToolRegistry);

      expect(JSON.stringify(filtered1)).toBe(JSON.stringify(filtered2));
    });
  });
});

/**
 * ===================================================================
 * NAVIGATION.BREADCRUMBS TESTS (Unit Tests)
 * ===================================================================
 */

describe('NavigationBreadcrumbs', () => {
  let mockToolRegistry: MockToolRegistry;
  let baseTree: NavTree;

  beforeEach(() => {
    mockToolRegistry = new MockToolRegistry();

    baseTree = {
      groups: [
        {
          id: 'nav-group-main',
          label: 'Principal',
          order: 0,
          items: [
            {
              id: 'nav-dashboard',
              label: 'Dashboard',
              type: 'link',
              url: '/dashboard',
              routeKey: 'dashboard',
              icon: 'home',
              disabled: false,
            },
          ],
        },
        {
          id: 'nav-group-tools',
          label: 'Ferramentas',
          order: 100,
          items: [
            {
              id: 'nav-tool-financeiro',
              label: 'Financeiro',
              type: 'link',
              url: '/tools/financeiro',
              toolKey: 'financeiro',
              icon: 'wallet',
              disabled: false,
            },
          ],
        },
      ],
      meta: {
        totalItems: 2,
        generatedAt: new Date().getTime(),
      },
      version: 1,
    };
  });

  describe('resolveBreadcrumbs', () => {
    it('should resolve breadcrumbs for root URL', () => {
      const breadcrumbs = resolveBreadcrumbs('/', baseTree, mockToolRegistry);

      expect(breadcrumbs).toBeDefined();
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);
      expect(breadcrumbs[0].label).toBe('Início');
    });

    it('should resolve breadcrumbs for Shell route', () => {
      const breadcrumbs = resolveBreadcrumbs('/dashboard', baseTree, mockToolRegistry);

      expect(breadcrumbs.length).toBeGreaterThanOrEqual(2);
      expect(breadcrumbs[0].label).toBe('Início');
      expect(breadcrumbs[breadcrumbs.length - 1].label).toBe('Dashboard');
    });

    it('should resolve breadcrumbs for tool base route', () => {
      const breadcrumbs = resolveBreadcrumbs('/tools/financeiro', baseTree, mockToolRegistry);

      expect(breadcrumbs.length).toBeGreaterThanOrEqual(2);
      expect(breadcrumbs[0].label).toBe('Início');
      
      const toolCrumb = breadcrumbs.find((b) => b.label === 'Financeiro');
      expect(toolCrumb).toBeDefined();
    });

    it('should resolve breadcrumbs for tool subpath (deep link)', () => {
      const breadcrumbs = resolveBreadcrumbs('/tools/financeiro/invoices', baseTree, mockToolRegistry);

      expect(breadcrumbs.length).toBeGreaterThanOrEqual(2);
      
      const toolCrumb = breadcrumbs.find((b) => b.label === 'Financeiro');
      expect(toolCrumb).toBeDefined();
      
      const lastCrumb = breadcrumbs[breadcrumbs.length - 1];
      expect(lastCrumb.isActive).toBe(true);
    });

    it('should mark last breadcrumb as active', () => {
      const breadcrumbs = resolveBreadcrumbs('/dashboard', baseTree, mockToolRegistry);

      const activeCrumbs = breadcrumbs.filter((b) => b.isActive);
      expect(activeCrumbs.length).toBe(1);
      expect(activeCrumbs[0]).toBe(breadcrumbs[breadcrumbs.length - 1]);
    });

    it('should include URLs in breadcrumbs for navigation', () => {
      const breadcrumbs = resolveBreadcrumbs('/tools/financeiro', baseTree, mockToolRegistry);

      const homeCrumb = breadcrumbs[0];
      expect(homeCrumb.url).toBe('/');
      
      const toolCrumb = breadcrumbs.find((b) => b.label === 'Financeiro');
      if (toolCrumb) {
        expect(toolCrumb.url).toBe('/tools/financeiro');
      }
    });

    it('should handle unknown URL gracefully', () => {
      const breadcrumbs = resolveBreadcrumbs('/unknown/route', baseTree, mockToolRegistry);

      expect(breadcrumbs).toBeDefined();
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(1);
      expect(breadcrumbs[0].label).toBe('Início');
    });

    it('should produce same breadcrumbs for same URL (determinism)', () => {
      const breadcrumbs1 = resolveBreadcrumbs('/tools/financeiro', baseTree, mockToolRegistry);
      const breadcrumbs2 = resolveBreadcrumbs('/tools/financeiro', baseTree, mockToolRegistry);

      expect(breadcrumbs1.length).toBe(breadcrumbs2.length);
      expect(breadcrumbs1.map((b) => b.label)).toEqual(breadcrumbs2.map((b) => b.label));
    });
  });
});

/**
 * ===================================================================
 * NAVIGATION.ACTIVE TESTS (Unit Tests)
 * ===================================================================
 */

describe('NavigationActive', () => {
  let baseTree: NavTree;

  beforeEach(() => {
    baseTree = {
      groups: [
        {
          id: 'nav-group-main',
          label: 'Principal',
          order: 0,
          items: [
            {
              id: 'nav-dashboard',
              label: 'Dashboard',
              type: 'link',
              url: '/dashboard',
              routeKey: 'dashboard',
              icon: 'home',
              disabled: false,
            },
            {
              id: 'nav-settings',
              label: 'Settings',
              type: 'link',
              url: '/settings',
              routeKey: 'settings',
              icon: 'cog',
              disabled: false,
            },
          ],
        },
        {
          id: 'nav-group-tools',
          label: 'Ferramentas',
          order: 100,
          items: [
            {
              id: 'nav-tool-financeiro',
              label: 'Financeiro',
              type: 'link',
              url: '/tools/financeiro',
              toolKey: 'financeiro',
              icon: 'wallet',
              disabled: false,
            },
            {
              id: 'nav-tool-crm',
              label: 'CRM',
              type: 'link',
              url: '/tools/crm',
              toolKey: 'crm',
              icon: 'users',
              disabled: false,
            },
          ],
        },
      ],
      meta: {
        totalItems: 4,
        generatedAt: new Date().getTime(),
      },
      version: 1,
    };
  });

  describe('resolveActiveItem', () => {
    it('should resolve active item for exact URL match', () => {
      const activeItem = resolveActiveItem('/dashboard', baseTree);

      expect(activeItem).toBeDefined();
      expect(activeItem?.id).toBe('nav-dashboard');
      expect(activeItem?.label).toBe('Dashboard');
    });

    it('should resolve active item for tool base route', () => {
      const activeItem = resolveActiveItem('/tools/financeiro', baseTree);

      expect(activeItem).toBeDefined();
      expect(activeItem?.id).toBe('nav-tool-financeiro');
      expect(activeItem?.toolKey).toBe('financeiro');
    });

    it('should resolve active item for tool subpath (prefix matching)', () => {
      const activeItem = resolveActiveItem('/tools/financeiro/invoices', baseTree);

      expect(activeItem).toBeDefined();
      expect(activeItem?.id).toBe('nav-tool-financeiro');
      expect(activeItem?.toolKey).toBe('financeiro');
    });

    it('should return null for unknown URL', () => {
      const activeItem = resolveActiveItem('/unknown/route', baseTree);

      expect(activeItem).toBeNull();
    });

    it('should handle case insensitive matching', () => {
      const activeItem = resolveActiveItem('/Dashboard', baseTree);

      expect(activeItem?.id).toBe('nav-dashboard');
    });

    it('should handle trailing slash', () => {
      const activeItem = resolveActiveItem('/dashboard/', baseTree);

      expect(activeItem?.id).toBe('nav-dashboard');
    });

    it('should ignore query string and hash in URL', () => {
      const activeItem = resolveActiveItem('/dashboard?tab=overview#section1', baseTree);

      expect(activeItem?.id).toBe('nav-dashboard');
    });

    it('should produce same active item for same URL (determinism)', () => {
      const activeItem1 = resolveActiveItem('/tools/financeiro', baseTree);
      const activeItem2 = resolveActiveItem('/tools/financeiro', baseTree);

      expect(activeItem1?.id).toBe(activeItem2?.id);
    });
  });
});
