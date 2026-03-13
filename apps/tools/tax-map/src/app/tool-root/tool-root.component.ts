/**
 * ToolRootComponent
 * 
 * Container raiz da Tool que hospeda o router-outlet para children routes.
 * Todas as rotas internas da tool renderizam dentro deste container.
 * 
 * Responsabilidades:
 * - Hospedar <router-outlet> para children
 * - Layout interno da tool (header/sidebar/footer opcionais)
 * - Estado de loading/erro compartilhado entre páginas internas
 */

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ToolContextAdapter, ToolContext, ToolContextChange, ToolRuntimeCapabilities } from '@hub/tool-contract';
import { ToolEventsService } from '@hub/tool-plugin';

const TOOL_KEY = 'tax-map';
const TOOL_TITLE = 'Tax Map';

@Component({
  selector: 'app-tool-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tool-root-container" [attr.data-tool-key]="toolKey">
      <header class="tool-header">
        <div>
          <p class="tool-eyebrow">Tool container</p>
          <h1>{{ title }}</h1>
          <p class="tool-subtitle" *ngIf="toolContext as context">
            {{ context.tenantName }} · {{ context.environment }}
          </p>
        </div>

        <div class="tool-status" *ngIf="capabilities as caps">
          <span class="badge" [class.badge-disabled]="!caps.isToolEnabled">
            {{ caps.isToolEnabled ? 'enabled' : 'disabled' }}
          </span>
          <span class="badge badge-muted">features: {{ caps.enabledFeatures.length }}</span>
        </div>
      </header>

      <div class="tool-state tool-loading" *ngIf="loading">Carregando contexto da tool...</div>
      <div class="tool-state tool-error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <main class="tool-content" *ngIf="!loading && !errorMessage">
        <router-outlet />
      </main>
    </section>
  `,
  styles: [
    `
      .tool-root-container {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        width: 100%;
        background: #fff;
      }

      .tool-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #e5e7eb;
        background-color: #f9fafb;
      }

      .tool-eyebrow {
        margin: 0 0 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }

      h1 {
        margin: 0;
        font-size: 1.5rem;
        line-height: 1.2;
      }

      .tool-subtitle {
        margin: 0.25rem 0 0;
        color: #4b5563;
      }

      .tool-status {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .badge {
        border-radius: 999px;
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        font-weight: 600;
        background: #dcfce7;
        color: #166534;
      }

      .badge-disabled {
        background: #fee2e2;
        color: #991b1b;
      }

      .badge-muted {
        background: #e5e7eb;
        color: #374151;
      }

      .tool-state {
        margin: 1rem 1.25rem 0;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
      }

      .tool-loading {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .tool-error {
        background: #fef2f2;
        color: #b91c1c;
      }

      .tool-content {
        flex: 1;
        overflow: auto;
        padding: 1rem 1.25rem;
      }
    `,
  ],
})
export class ToolRootComponent implements OnInit, OnDestroy {
  readonly toolKey = TOOL_KEY;
  readonly title = TOOL_TITLE;

  loading = true;
  errorMessage: string | null = null;
  toolContext: ToolContext | null = null;
  capabilities: ToolRuntimeCapabilities | null = null;

  private readonly destroy$ = new Subject<void>();
  private readonly toolContextAdapter = inject(ToolContextAdapter, { optional: true }) ?? new ToolContextAdapter();
  private readonly toolEvents = inject(ToolEventsService, { optional: true }) ?? new ToolEventsService();

  ngOnInit(): void {
    try {
      this.toolEvents.emitLoaded(this.toolKey, { stage: 'init' });
      this.refreshSnapshot();
      this.observeContextChanges();
      this.toolEvents.emitReady(this.toolKey, {
        hasContext: !!this.toolContext,
        isToolEnabled: this.capabilities?.isToolEnabled ?? true,
      });
    } catch (error) {
      this.handleError(error, 'initialization');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.toolEvents.emitUnloaded(this.toolKey, { stage: 'destroy' });
  }

  private observeContextChanges(): void {
    this.toolContextAdapter.contextChange$
      .pipe(
        filter((change): change is ToolContextChange => !!change),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (change) => {
          this.toolContext = change.current;
          this.toolContextAdapter.refreshCapabilities(this.toolKey);
          this.capabilities = this.toolContextAdapter.contextSnapshot(this.toolKey)?.capabilities ?? this.capabilities;
          this.loading = false;
          this.toolEvents.emitContextChanged(
            this.toolKey,
            {
              tenantId: change.current.tenantId,
              clientId: change.current.clientId ?? undefined,
              projectId: change.current.projectId ?? undefined,
              userId: change.current.session.userId,
            },
            { changeType: change.changeType }
          );
        },
        error: (error) => this.handleError(error, 'context-change'),
      });
  }

  private refreshSnapshot(): void {
    const snapshot = this.toolContextAdapter.contextSnapshot(this.toolKey);

    this.toolContext = snapshot?.context ?? null;
    this.capabilities = snapshot?.capabilities ?? null;
    this.loading = !snapshot;

    if (!snapshot) {
      this.errorMessage = null;
      return;
    }

    this.errorMessage = null;
  }

  private handleError(error: unknown, stage: string): void {
    const message = error instanceof Error ? error.message : 'Falha inesperada no container da tool.';
    this.loading = false;
    this.errorMessage = message;
    this.toolEvents.emitError(this.toolKey, message, { stage });
  }
}
