import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, catchError, map, merge, of, switchMap, tap, timer } from 'rxjs';
import { NotificationFeedItem, NotificationItem, NotificationSeverity } from './notification.model';
import {
  NOTIFICATION_CENTER_CONTEXT_SOURCE,
  NOTIFICATION_CENTER_DATA_SOURCE,
  NOTIFICATION_CENTER_FEEDBACK_SOURCE,
  NOTIFICATION_CENTER_NAVIGATION_SOURCE,
  NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
  NotificationCenterContextSource,
  NotificationCenterDataSource,
  NotificationCenterFeedbackSource,
  NotificationCenterNavigationSource,
  NotificationCenterObservabilitySource,
} from './notification-center.facades';

type NotificationFilter = 'all' | 'unread';
type SeverityFilter = 'all' | NotificationSeverity;

const PAGE_SIZE = 50;

const NOTIFICATION_CENTER_TEXT = {
  loadError: 'Não foi possível carregar as notificações.',
  markReadError: 'Falha ao marcar notificação como lida.',
  markAllReadError: 'Falha ao marcar notificações como lidas.',
  markAllReadUnavailable: 'Marcação em lote indisponível no data source de notificações.',
  clearError: 'Falha ao limpar notificações.',
} as const;

@Component({
  selector: 'hub-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent implements OnInit {
  private readonly notificationService = inject(NOTIFICATION_CENTER_DATA_SOURCE) as NotificationCenterDataSource;
  private readonly contextService = inject(NOTIFICATION_CENTER_CONTEXT_SOURCE) as NotificationCenterContextSource;
  private readonly navigationService = inject(NOTIFICATION_CENTER_NAVIGATION_SOURCE) as NotificationCenterNavigationSource;
  private readonly observabilityService = inject(NOTIFICATION_CENTER_OBSERVABILITY_SOURCE) as NotificationCenterObservabilitySource;
  private readonly feedbackService = inject(NOTIFICATION_CENTER_FEEDBACK_SOURCE) as NotificationCenterFeedbackSource;
  private readonly destroyRef = inject(DestroyRef);
  private readonly invalidPayloadTelemetryKeys = new Set<string>();

  @ViewChild('panelContent') private panelContent?: ElementRef<HTMLElement>;

  readonly isPanelOpen = signal(true);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly filter = signal<NotificationFilter>('all');
  readonly severityFilter = signal<SeverityFilter>('all');
  readonly visibleLimit = signal(PAGE_SIZE);
  readonly text = NOTIFICATION_CENTER_TEXT;

  readonly unreadCount = computed(
    () => this.notifications().filter((notification) => !notification.readAt).length
  );

  readonly filteredNotifications = computed(() => {
    const selectedFilter = this.filter();
    const selectedSeverity = this.severityFilter();

    return this.notifications().filter((notification) => {
      const matchesReadFilter =
        selectedFilter === 'all' ? true : notification.readAt === null || notification.readAt === undefined;
      const matchesSeverity =
        selectedSeverity === 'all' ? true : notification.severity === selectedSeverity;

      return matchesReadFilter && matchesSeverity;
    });
  });

  readonly visibleNotifications = computed(() => this.filteredNotifications().slice(0, this.visibleLimit()));
  readonly hasMoreNotifications = computed(
    () => this.filteredNotifications().length > this.visibleNotifications().length
  );

  ngOnInit(): void {
    this.observabilityService.trackEvent('notification_center_open');

    this.createNotificationSource$()
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.errorMessage.set(null);
        }),
        map((feed) => this.normalizeFeed(feed)),
        map((feed) => this.sortNotifications(feed)),
        tap(() => this.isLoading.set(false)),
        catchError((error) => {
          this.isLoading.set(false);
          this.reportOperationalError('notification_center_load_error', this.text.loadError, error);
          return of<NotificationItem[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((items) => {
        this.notifications.set(items);
        this.resetVisibleLimit();
      });

    this.focusFirstActionable();
  }

  togglePanel(): void {
    const nextOpenState = !this.isPanelOpen();
    this.isPanelOpen.set(nextOpenState);
    this.observabilityService.trackEvent(nextOpenState ? 'notification_center_open' : 'notification_center_close');

    if (nextOpenState) {
      this.focusFirstActionable();
    }
  }

  setFilter(nextFilter: NotificationFilter): void {
    this.filter.set(nextFilter);
    this.resetVisibleLimit();
  }

  setSeverityFilter(nextFilter: SeverityFilter): void {
    this.severityFilter.set(nextFilter);
    this.resetVisibleLimit();
  }

  loadMoreNotifications(): void {
    this.visibleLimit.update((currentLimit) => currentLimit + PAGE_SIZE);
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.readAt) {
      return;
    }

    this.notificationService
      .markAsRead(notification.id)
      .pipe(
        tap(() => {
          this.notifications.update((currentNotifications) =>
            currentNotifications.map((currentNotification) =>
              currentNotification.id === notification.id
                ? { ...currentNotification, readAt: new Date() }
                : currentNotification
            )
          );
          this.observabilityService.trackEvent('notification_mark_read', {
            notificationId: notification.id,
            severity: notification.severity,
          });
        }),
        catchError((error) => {
          this.reportOperationalError('notification_mark_read_error', this.text.markReadError, error, {
            notificationId: notification.id,
          });
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications().filter((notification) => !notification.readAt);

    if (unreadNotifications.length === 0) {
      return;
    }

    const unreadIds = unreadNotifications.map((notification) => notification.id);
    if (!this.notificationService.markAllAsReadBatch) {
      this.reportOperationalError(
        'notification_mark_read_all_batch_unavailable',
        this.text.markAllReadUnavailable,
        new Error('markAllAsReadBatch_not_available')
      );
      return;
    }

    const markAllRequest$ = this.notificationService.markAllAsReadBatch(unreadIds);

    markAllRequest$
      .pipe(
        tap(() => {
          const now = new Date();
          this.notifications.update((currentNotifications) =>
            currentNotifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt ?? now,
            }))
          );
          this.observabilityService.trackEvent('notification_mark_read_all', {
            count: unreadNotifications.length,
          });
        }),
        catchError((error) => {
          this.reportOperationalError('notification_mark_read_all_error', this.text.markAllReadError, error);
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  clearAll(): void {
    this.notificationService
      .clearAll()
      .pipe(
        tap(() => {
          const clearedCount = this.notifications().length;
          this.notifications.set([]);
          this.observabilityService.trackEvent('notification_clear', { count: clearedCount });
        }),
        catchError((error) => {
          this.reportOperationalError('notification_clear_error', this.text.clearError, error);
          return of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  onNotificationClick(notification: NotificationItem): void {
    this.observabilityService.trackEvent('notification_click', {
      notificationId: notification.id,
      hasLink: !!notification.link,
      severity: notification.severity,
    });

    if (!notification.readAt) {
      this.markAsRead(notification);
    }

    if (!notification.link) {
      return;
    }

    this.navigationService.navigateTo(notification.link);
  }

  retryLoad(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.notificationService
      .getNotifications()
      .pipe(
        map((feed) => this.normalizeFeed(feed)),
        map((feed) => this.sortNotifications(feed)),
        tap((feed) => {
          this.notifications.set(feed);
          this.resetVisibleLimit();
        }),
        tap(() => this.isLoading.set(false)),
        catchError((error) => {
          this.isLoading.set(false);
          this.reportOperationalError('notification_center_retry_error', this.text.loadError, error);
          return of<NotificationItem[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  getNotificationAriaLabel(notification: NotificationItem): string {
    const title = notification.title || 'Notificação';
    const status = notification.readAt ? 'lida' : 'não lida';
    return `${title}, ${notification.severity}, ${status}`;
  }

  onPanelEscape(): void {
    if (!this.isPanelOpen()) {
      return;
    }

    this.togglePanel();
  }

  private createNotificationSource$(): Observable<NotificationFeedItem[]> {
    const contextChanges$ = this.contextService.contextChange$ ?? EMPTY;
    const pushStream$ = this.notificationService.notifications$;

    if (pushStream$) {
      return merge(of(null), contextChanges$).pipe(switchMap(() => pushStream$));
    }

    return merge(of(null), contextChanges$).pipe(switchMap(() => this.notificationService.getNotifications()));
  }

  private resetVisibleLimit(): void {
    this.visibleLimit.set(PAGE_SIZE);
  }

  private reportOperationalError(
    errorName: string,
    message: string,
    error: unknown,
    properties?: Record<string, unknown>
  ): void {
    this.errorMessage.set(message);
    this.feedbackService.showError(message);
    this.observabilityService.trackError(errorName, error, properties);
  }

  private focusFirstActionable(): void {
    timer(0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isPanelOpen()) {
          return;
        }

        const firstActionable = this.panelContent?.nativeElement.querySelector<HTMLElement>(
          '[data-testid="notification-item"], [data-testid="filter-all"]'
        );
        firstActionable?.focus();
      });
  }

  private normalizeFeed(feed: NotificationFeedItem[]): NotificationItem[] {
    return feed.map((item) => {
      const now = new Date();
      const createdAtCandidate = this.parseDate(item.createdAt ?? item.timestamp);
      const createdAt = createdAtCandidate ?? now;
      if (!createdAtCandidate) {
        this.trackInvalidPayload(item.id, 'createdAt');
      }

      const isRead = item.readAt !== undefined && item.readAt !== null ? true : !!item.read;
      const parsedReadAt = item.readAt !== undefined && item.readAt !== null ? this.parseDate(item.readAt) : null;
      if (item.readAt !== undefined && item.readAt !== null && !parsedReadAt) {
        this.trackInvalidPayload(item.id, 'readAt');
      }
      const readAt = isRead ? parsedReadAt ?? (item.read ? createdAt : null) : null;

      return {
        id: item.id,
        title: item.title ?? 'Notificação',
        body: item.body ?? item.message ?? '',
        severity: item.severity ?? item.type ?? 'info',
        link: item.link ?? null,
        createdAt,
        readAt,
      };
    });
  }

  private parseDate(value: Date | string | null | undefined): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  private trackInvalidPayload(notificationId: string, field: 'createdAt' | 'readAt'): void {
    const telemetryKey = `${notificationId}:${field}`;
    if (this.invalidPayloadTelemetryKeys.has(telemetryKey)) {
      return;
    }

    this.invalidPayloadTelemetryKeys.add(telemetryKey);
    this.observabilityService.trackEvent('notification_payload_invalid', {
      notificationId,
      field,
    });
  }

  private sortNotifications(feed: NotificationItem[]): NotificationItem[] {
    return [...feed].sort((left, right) => {
      const leftRead = !!left.readAt;
      const rightRead = !!right.readAt;

      if (leftRead !== rightRead) {
        return leftRead ? 1 : -1;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
  }
}
