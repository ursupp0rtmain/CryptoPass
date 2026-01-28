import { Injectable, signal, computed } from '@angular/core';
import { Notification, ShareRequest, ShareRequestMetadata } from '../interfaces/share-request';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsKey = 'cryptopass_notifications';
  private shareRequestsKey = 'cryptopass_share_requests';

  public notifications = signal<Notification[]>([]);
  public unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  constructor(private storageService: StorageService) {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem(this.notificationsKey);
      if (stored) {
        this.notifications.set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private saveNotifications(): void {
    try {
      localStorage.setItem(this.notificationsKey, JSON.stringify(this.notifications()));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: Date.now(),
    };

    this.notifications.update((notifications) => [newNotification, ...notifications]);
    this.saveNotifications();
  }

  markAsRead(id: string): void {
    this.notifications.update((notifications) =>
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    this.saveNotifications();
  }

  markAllAsRead(): void {
    this.notifications.update((notifications) => notifications.map((n) => ({ ...n, read: true })));
    this.saveNotifications();
  }

  removeNotification(id: string): void {
    this.notifications.update((notifications) => notifications.filter((n) => n.id !== id));
    this.saveNotifications();
  }

  clearAll(): void {
    this.notifications.set([]);
    this.saveNotifications();
  }

  // Share Request Storage (local pending requests)
  async saveShareRequest(request: ShareRequest): Promise<void> {
    try {
      const requests = this.getLocalShareRequests();
      requests[request.id] = request;
      localStorage.setItem(this.shareRequestsKey, JSON.stringify(requests));
    } catch (error) {
      console.error('Error saving share request:', error);
    }
  }

  getLocalShareRequests(): Record<string, ShareRequest> {
    try {
      const stored = localStorage.getItem(this.shareRequestsKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading share requests:', error);
      return {};
    }
  }

  getShareRequest(id: string): ShareRequest | null {
    const requests = this.getLocalShareRequests();
    return requests[id] || null;
  }

  updateShareRequestStatus(id: string, status: ShareRequest['status']): void {
    const requests = this.getLocalShareRequests();
    if (requests[id]) {
      requests[id].status = status;
      localStorage.setItem(this.shareRequestsKey, JSON.stringify(requests));
    }
  }

  removeShareRequest(id: string): void {
    const requests = this.getLocalShareRequests();
    delete requests[id];
    localStorage.setItem(this.shareRequestsKey, JSON.stringify(requests));
  }
}
