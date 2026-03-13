import { LayoutState } from './ui-layout.model';

export default {
  title: 'Shared UI/UiLayout',
  parameters: {
    docs: {
      description: {
        component:
          'Cenários base do UiLayout: slots, sidebar collapsed/mobile e right-panel aberto.',
      },
    },
  },
};

const baseState: LayoutState = {
  isMobile: false,
  sidebar: {
    collapsed: false,
    mobileOpen: false,
  },
  rightPanel: {
    open: false,
  },
};

const baseTemplate = `
  <ui-layout-shell [state]="state">
    <ui-topbar>Topbar</ui-topbar>

    <ui-sidebar
      [collapsed]="state.sidebar?.collapsed"
      [mobile]="state.isMobile"
      [mobileOpen]="state.sidebar?.mobileOpen"
    >
      Sidebar
    </ui-sidebar>

    <ui-content-frame [padded]="true" [scrollable]="true">
      Content
    </ui-content-frame>

    <ui-right-panel [state]="state.rightPanel || { open: false }">
      Right Panel
    </ui-right-panel>
  </ui-layout-shell>
`;

export const DefaultLayout = {
  render: () => ({
    props: {
      state: baseState,
    },
    template: baseTemplate,
  }),
};

export const SidebarCollapsed = {
  render: () => ({
    props: {
      state: {
        ...baseState,
        sidebar: {
          collapsed: true,
          mobileOpen: false,
        },
      } as LayoutState,
    },
    template: baseTemplate,
  }),
};

export const MobileDrawerOpen = {
  render: () => ({
    props: {
      state: {
        ...baseState,
        isMobile: true,
        sidebar: {
          collapsed: false,
          mobileOpen: true,
        },
      } as LayoutState,
    },
    template: baseTemplate,
  }),
};

export const RightPanelOpen = {
  render: () => ({
    props: {
      state: {
        ...baseState,
        rightPanel: {
          open: true,
        },
      } as LayoutState,
    },
    template: baseTemplate,
  }),
};

export const RightPanelKeyboardInteraction = {
  render: () => ({
    props: {
      state: {
        ...baseState,
        rightPanel: {
          open: true,
        },
      } as LayoutState,
      onCloseFromKeyboard(): void {
        this.state = {
          ...this.state,
          rightPanel: {
            open: false,
          },
        } as LayoutState;
      },
    },
    template: `
      <p>Pressione Escape para fechar o Right Panel.</p>
      <ui-layout-shell [state]="state">
        <ui-topbar>Topbar</ui-topbar>

        <ui-sidebar
          [collapsed]="state.sidebar?.collapsed"
          [mobile]="state.isMobile"
          [mobileOpen]="state.sidebar?.mobileOpen"
        >
          Sidebar
        </ui-sidebar>

        <ui-content-frame [padded]="true" [scrollable]="true">
          Content
        </ui-content-frame>

        <ui-right-panel
          [state]="state.rightPanel || { open: false }"
          (close)="onCloseFromKeyboard()"
        >
          Right Panel (fecha ao pressionar Escape)
        </ui-right-panel>
      </ui-layout-shell>
    `,
  }),
};
