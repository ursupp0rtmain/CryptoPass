import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../interfaces/share-request';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  private notificationService = inject(NotificationService);

  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  shareRequestClicked = output<string>();

  protected isOpen = false;

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.notificationService.markAllAsRead();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  onNotificationClick(notification: Notification): void {
    if (notification.type === 'share_request' && notification.data) {
      this.shareRequestClicked.emit(notification.data.id);
      this.close();
    }
  }

  removeNotification(event: Event, id: string): void {
    event.stopPropagation();
    this.notificationService.removeNotification(id);
  }

  clearAll(): void {
    this.notificationService.clearAll();
  }

  getIcon(type: Notification['type']): string {
    switch (type) {
      case 'share_request':
        return 'pi-share-alt';
      case 'share_accepted':
        return 'pi-check-circle';
      case 'share_rejected':
        return 'pi-times-circle';
      default:
        return 'pi-info-circle';
    }
  }

  formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}
