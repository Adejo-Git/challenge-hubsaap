export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  link?: string | null;
  createdAt: Date;
  readAt?: Date | null;
}

export interface NotificationFeedItem {
  id: string;
  title?: string;
  body?: string;
  message?: string;
  severity?: NotificationSeverity;
  type?: NotificationSeverity;
  link?: string | null;
  createdAt?: Date | string;
  timestamp?: Date | string;
  readAt?: Date | string | null;
  read?: boolean;
}
