import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, take } from 'rxjs';
import { NotificationFeedItem } from '../shell/notifications/notification-center/notification.model';

export interface Notification extends NotificationFeedItem {
  id: string;
}

/**
 * NotificationServiceMock
 * 
 * Mock do NotificationService da Shared Libs.
 * Simula agregação de notificações de múltiplas fontes.
 * 
 * TODO: Substituir por @hub/shared/notification quando disponível.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationServiceMock {
  private notificationState: Notification[] = [
    {
      id: 'notif-1',
      title: 'Bem-vindo ao Hub-Saap!',
      body: 'Acompanhe notificações do ambiente atual.',
      severity: 'info',
      createdAt: new Date(),
      readAt: null,
      message: 'Bem-vindo ao Hub-Saap!',
      type: 'info',
      timestamp: new Date(),
      read: false,
    },
  ];

  private readonly notificationSubject = new BehaviorSubject<Notification[]>([...this.notificationState]);
  readonly notifications$ = this.notificationSubject.asObservable();

  /**
   * Simula a recuperação de notificações agregadas.
   */
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.pipe(take(1));
  }

  /**
   * Marca notificação como lida.
   */
  markAsRead(notificationId: string): Observable<void> {
    const now = new Date();
    this.notificationState = this.notificationState.map((notification) =>
      notification.id === notificationId
        ? { ...notification, read: true, readAt: notification.readAt ?? now }
        : notification
    );

    this.notificationSubject.next([...this.notificationState]);

    console.log(`[NotificationServiceMock] Notificação ${notificationId} marcada como lida`);
    return of(undefined);
  }

  markAllAsReadBatch(notificationIds: string[]): Observable<void> {
    const notificationIdSet = new Set(notificationIds);
    const now = new Date();
    this.notificationState = this.notificationState.map((notification) =>
      notificationIdSet.has(notification.id)
        ? { ...notification, read: true, readAt: notification.readAt ?? now }
        : notification
    );

    this.notificationSubject.next([...this.notificationState]);
    return of(undefined);
  }

  clearAll(): Observable<void> {
    this.notificationState = [];
    this.notificationSubject.next([]);
    console.log('[NotificationServiceMock] Notificações limpas');
    return of(undefined);
  }
}
