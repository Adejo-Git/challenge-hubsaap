import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationFeedItem } from './notification.model';

export interface NotificationCenterDataSource {
  readonly notifications$?: Observable<NotificationFeedItem[]>;
  getNotifications(): Observable<NotificationFeedItem[]>;
  markAsRead(notificationId: string): Observable<void>;
  markAllAsReadBatch?(notificationIds: string[]): Observable<void>;
  clearAll(): Observable<void>;
}

export interface NotificationCenterContextSource {
  readonly contextChange$: Observable<unknown>;
}

export interface NotificationCenterNavigationSource {
  navigateTo(path: string): void;
}

export interface NotificationCenterObservabilitySource {
  trackEvent(eventName: string, properties?: Record<string, unknown>): void;
  trackError(errorName: string, error: unknown, properties?: Record<string, unknown>): void;
}

export interface NotificationCenterFeedbackSource {
  showError(message: string): void;
}

export const NOTIFICATION_CENTER_DATA_SOURCE =
  new InjectionToken<NotificationCenterDataSource>('NOTIFICATION_CENTER_DATA_SOURCE');

export const NOTIFICATION_CENTER_CONTEXT_SOURCE =
  new InjectionToken<NotificationCenterContextSource>('NOTIFICATION_CENTER_CONTEXT_SOURCE');

export const NOTIFICATION_CENTER_NAVIGATION_SOURCE =
  new InjectionToken<NotificationCenterNavigationSource>('NOTIFICATION_CENTER_NAVIGATION_SOURCE');

export const NOTIFICATION_CENTER_OBSERVABILITY_SOURCE =
  new InjectionToken<NotificationCenterObservabilitySource>('NOTIFICATION_CENTER_OBSERVABILITY_SOURCE');

export const NOTIFICATION_CENTER_FEEDBACK_SOURCE =
  new InjectionToken<NotificationCenterFeedbackSource>('NOTIFICATION_CENTER_FEEDBACK_SOURCE');