import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Web3Service } from '../../services/web3.service';
import { EncryptionService } from '../../services/encryption.service';
import { StorageService } from '../../services/storage.service';
import { NotificationService } from '../../services/notification.service';
import { TotpService } from '../../services/totp.service';
import { AddPasswordComponent } from '../../components/add-password/add-password.component';
import { NotificationsComponent } from '../../components/notifications/notifications.component';
import { ShareDialogComponent } from '../../components/share-dialog/share-dialog.component';
import { ReceiveDialogComponent } from '../../components/receive-dialog/receive-dialog.component';
import { Password, VaultItem, VaultItemType, Card, Address, SecureNote } from '../../interfaces/password';
import { Vault } from '../../interfaces/vault';
import { ShareRequest } from '../../interfaces/share-request';

@Component({
  selector: 'app-vault',
  imports: [
    CommonModule,
    FormsModule,
    AddPasswordComponent,
    NotificationsComponent,
    ShareDialogComponent,
    ReceiveDialogComponent,
  ],
  templateUrl: './vault.component.html',
  styleUrl: './vault.component.scss',
})
export class VaultComponent implements OnInit, OnDestroy {
  private web3Service = inject(Web3Service);
  private encryptionService = inject(EncryptionService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);
  private totpService = inject(TotpService);
  private router = inject(Router);
  private totpInterval: any;

  protected passwords = signal<VaultItem[]>([]);
  protected searchTerm = signal('');
  protected selectedItemType = signal<VaultItemType | 'all'>('all');
  protected isLoading = signal(false);
  protected isSaving = signal(false);
  protected showAddForm = signal(false);
  protected selectedPassword = signal<VaultItem | null>(null);
  protected selectedPasswordId = signal<string | null>(null);
  protected showDetailPassword = signal(false);
  protected walletState = this.web3Service.walletState;
  protected showAddDropdown = signal(false);
  protected newItemType = signal<VaultItemType>('login');

  // Item type filter options
  protected itemTypeOptions = [
    { value: 'all', label: 'All Items', icon: 'pi-th-large' },
    { value: 'login', label: 'Login', icon: 'pi-key' },
    { value: 'note', label: 'Secure Note', icon: 'pi-file' },
    { value: 'address', label: 'Address', icon: 'pi-map-marker' },
    { value: 'card', label: 'Card', icon: 'pi-credit-card' },
  ] as const;

  // 2FA Tab state
  protected show2FATab = signal(false);
  protected is2FAUnlocked = signal(false);
  protected twoFAPassword = signal('');
  protected twoFAPasswordError = signal<string | null>(null);

  // Share dialog state
  protected showShareDialog = signal(false);
  protected passwordToShare = signal<VaultItem | null>(null);

  // Receive dialog state
  protected showReceiveDialog = signal(false);
  protected pendingShareRequest = signal<ShareRequest | null>(null);

  // Sync status
  protected lastSyncTime = signal<number | null>(null);
  protected syncError = signal<string | null>(null);
  
  // TOTP timer
  protected totpTimer = signal(30);

  protected filteredPasswords = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const typeFilter = this.selectedItemType();
    let items = this.passwords();

    // Filter by type
    if (typeFilter !== 'all') {
      items = items.filter(p => p.type === typeFilter);
    }

    // Filter by search term
    if (!term) return items;

    return items.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        (p.type === 'login' && p.username.toLowerCase().includes(term)) ||
        (p.type === 'login' && p.url?.toLowerCase().includes(term))
    );
  });

  async ngOnInit(): Promise<void> {
    if (!this.walletState().isConnected) {
      await this.router.navigate(['/login']);
      return;
    }

    await this.loadVault();
    
    // Start TOTP timer
    this.totpInterval = setInterval(() => {
      this.totpTimer.set(this.totpService.getRemainingSeconds());
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.totpInterval) {
      clearInterval(this.totpInterval);
    }
  }

  async loadVault(): Promise<void> {
    this.isLoading.set(true);
    try {
      const walletAddress = this.walletState().address;
      if (!walletAddress) throw new Error('No wallet address');

      const vault = await this.storageService.getLatestVault(walletAddress);

      if (vault && vault.passwords.length > 0) {
        // Try to decrypt passwords, skip those that fail
        const decryptedPasswords: VaultItem[] = [];
        for (const encryptedPassword of vault.passwords) {
          try {
            const decrypted = await this.encryptionService.decryptPassword(encryptedPassword);
            decryptedPasswords.push(decrypted);
          } catch (error) {
            console.warn('Skipping password that cannot be decrypted (wrong key):', encryptedPassword.id);
          }
        }
        
        this.passwords.set(decryptedPasswords);
        this.lastSyncTime.set(vault.updatedAt);

        // Sync loaded vault to browser extension
        this.syncToExtension();

        if (decryptedPasswords.length < vault.passwords.length) {
          this.notificationService.addNotification({
            type: 'system',
            title: 'Warnung',
            message: `${vault.passwords.length - decryptedPasswords.length} Passwörter konnten nicht entschlüsselt werden. Sie wurden möglicherweise mit einer anderen Wallet erstellt.`,
          });
        }
      }
    } catch (error) {
      console.error('Error loading vault:', error);
      this.notificationService.addNotification({
        type: 'system',
        title: 'Fehler',
        message: 'Fehler beim Laden des Vaults. Bitte melde dich erneut an.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async syncVault(): Promise<void> {
    this.isSaving.set(true);
    this.syncError.set(null);
    try {
      const walletAddress = this.walletState().address;
      if (!walletAddress) throw new Error('No wallet address');

      const encryptedPasswords = await Promise.all(
        this.passwords().map((p) => this.encryptionService.encryptPassword(p))
      );

      const vault: Vault = {
        version: '1.0.0',
        walletAddress,
        passwords: encryptedPasswords,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.storageService.uploadVault(vault);
      this.lastSyncTime.set(Date.now());
    } catch (error: any) {
      console.error('Error syncing vault:', error);
      this.syncError.set(error.message);
      throw error;
    } finally {
      this.isSaving.set(false);
    }
  }

  // Auto-save wrapper - called after any password change
  private async autoSave(): Promise<void> {
    try {
      await this.syncVault();
      // Also sync to browser extension if content script is present
      this.syncToExtension();
    } catch (error) {
      // Error already logged in syncVault
    }
  }

  // Sync decrypted vault to browser extension
  private syncToExtension(): void {
    try {
      const decryptedItems = this.passwords();
      window.postMessage({
        type: 'CRYPTOPASS_VAULT_UPDATE',
        vault: decryptedItems
      }, '*');
    } catch (error) {
      // Silent fail - extension may not be installed
    }
  }

  toggleAddDropdown(): void {
    this.showAddDropdown.update(v => !v);
  }

  addNewPasswordWithType(type: VaultItemType): void {
    this.newItemType.set(type);
    this.selectedPassword.set(null);
    this.showAddForm.set(true);
    this.showAddDropdown.set(false);
  }

  addNewPassword(): void {
    this.selectedPassword.set(null);
    this.showAddForm.set(true);
  }

  editPassword(item: VaultItem): void {
    this.selectedPassword.set(item);
    this.showAddForm.set(true);
  }

  async deletePassword(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this password?')) {
      try {
        // Optimistic update: Remove from local state immediately
        this.passwords.update((passwords) => passwords.filter((p) => p.id !== id));

        // Clear selection if deleted item was selected
        if (this.selectedPasswordId() === id) {
          this.clearSelection();
        }

        // Delete from Ceramic
        await this.storageService.deleteEntry(id);

        // Sync to browser extension
        this.syncToExtension();
      } catch (error: any) {
        console.error('Error deleting password:', error);
        // Reload vault to restore state on error
        await this.loadVault();
        this.notificationService.addNotification({
          type: 'system',
          title: 'Fehler',
          message: 'Fehler beim Löschen des Passworts: ' + error.message,
        });
      }
    }
  }

  async onPasswordSaved(item: VaultItem): Promise<void> {
    if (this.selectedPassword()) {
      this.passwords.update((passwords) =>
        passwords.map((p) => (p.id === item.id ? item : p))
      );
    } else {
      this.passwords.update((passwords) => [...passwords, item]);
    }
    this.showAddForm.set(false);
    this.selectedPassword.set(null);

    // Auto-save after password change
    await this.autoSave();
  }

  onCancelAdd(): void {
    this.showAddForm.set(false);
    this.selectedPassword.set(null);
  }

  // Share functionality (only for login items)
  openShareDialog(item: VaultItem): void {
    if (item.type === 'login') {
      this.passwordToShare.set(item);
      this.showShareDialog.set(true);
    }
  }

  closeShareDialog(): void {
    this.showShareDialog.set(false);
    this.passwordToShare.set(null);
  }

  async onShareRequestClicked(requestId: string): Promise<void> {
    const request = this.notificationService.getShareRequest(requestId);
    if (request) {
      // Decrypt the password before showing the dialog
      try {
        const decryptedJson = await this.encryptionService.decrypt(
          request.encryptedPassword,
          request.iv
        );
        const passwordData = JSON.parse(decryptedJson);
        
        // Add the decrypted password to the request
        const requestWithPassword: ShareRequest = {
          ...request,
          password: {
            id: crypto.randomUUID(), // Temporary ID
            ...passwordData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        };
        
        this.pendingShareRequest.set(requestWithPassword);
        this.showReceiveDialog.set(true);
      } catch (error) {
        console.error('Unable to decrypt password data:', error);
        this.notificationService.addNotification({
          type: 'system',
          title: 'Error',
          message: 'Unable to decrypt password data. It may have been encrypted with a different key.',
        });
      }
    }
  }

  closeReceiveDialog(): void {
    this.showReceiveDialog.set(false);
    this.pendingShareRequest.set(null);
  }

  async onShareAccepted(password: Password): Promise<void> {
    // Generate new ID for the saved password
    const newPassword: Password = {
      ...password,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.passwords.update((passwords) => [...passwords, newPassword]);
    this.closeReceiveDialog();

    // Remove the notification
    const request = this.pendingShareRequest();
    if (request) {
      this.notificationService.removeShareRequest(request.id);
    }

    await this.autoSave();
  }

  onShareRejected(): void {
    const request = this.pendingShareRequest();
    if (request) {
      this.notificationService.removeShareRequest(request.id);
    }
    this.closeReceiveDialog();
  }

  async logout(): Promise<void> {
    await this.web3Service.disconnect();
    this.encryptionService.clearMasterKey();
    this.passwords.set([]);
    await this.router.navigate(['/login']);
  }

  copyToClipboard(text: string, field: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        // Could use a toast notification instead of alert
      },
      (err) => {
        console.error('Could not copy text: ', err);
      }
    );
  }

  formatSyncTime(): string {
    const time = this.lastSyncTime();
    if (!time) return 'Never';

    const diff = Date.now() - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(time).toLocaleDateString();
  }

  selectPassword(item: VaultItem): void {
    this.selectedPassword.set(item);
    this.selectedPasswordId.set(item.id);
    this.showDetailPassword.set(false);
  }

  getItemIcon(item: VaultItem): string {
    const iconMap = {
      'login': 'pi pi-globe',
      'note': 'pi pi-file',
      'address': 'pi pi-map-marker',
      'card': 'pi pi-credit-card'
    };
    return iconMap[item.type] || 'pi pi-globe';
  }

  getSectionTitle(): string {
    const type = this.selectedItemType();
    if (type === 'all') return 'All Items';
    const option = this.itemTypeOptions.find(o => o.value === type);
    return option?.label || 'Items';
  }

  getItemTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'login': 'Store website credentials',
      'note': 'Save private text notes',
      'address': 'Store address information',
      'card': 'Save payment card details',
    };
    return descriptions[type] || '';
  }

  getTotpTimer(): number {
    return this.totpTimer();
  }

  getLastFourDigits(cardNumber?: string): string {
    if (!cardNumber) return '****';
    return cardNumber.slice(-4);
  }

  getAddressPreview(item: VaultItem): string {
    if (item.type !== 'address') return '';
    return `${item.city}, ${item.country}`;
  }

  isLogin(item: VaultItem | null): item is Password {
    return item?.type === 'login';
  }

  isNote(item: VaultItem | null): item is SecureNote {
    return item?.type === 'note';
  }

  isAddress(item: VaultItem | null): item is Address {
    return item?.type === 'address';
  }

  isCard(item: VaultItem | null): item is Card {
    return item?.type === 'card';
  }

  // 2FA Tab Methods
  open2FATab(): void {
    this.show2FATab.set(true);
    this.twoFAPasswordError.set(null);
  }

  close2FATab(): void {
    this.show2FATab.set(false);
    this.is2FAUnlocked.set(false);
    this.twoFAPassword.set('');
    this.twoFAPasswordError.set(null);
  }

  unlock2FA(): void {
    const password = this.twoFAPassword();
    // Simple password check - you can make this more sophisticated
    if (password.length < 4) {
      this.twoFAPasswordError.set('Password must be at least 4 characters');
      return;
    }
    this.is2FAUnlocked.set(true);
    this.twoFAPasswordError.set(null);
  }

  get2FAItems(): Password[] {
    return this.passwords().filter(item => 
      item.type === 'login' && (item as Password).totp
    ) as Password[];
  }

  getTotpCode(secret: string): string {
    try {
      return this.totpService.generateCode(secret);
    } catch {
      return '------';
    }
  }

  getTotpRemaining(): number {
    return this.totpService.getRemainingSeconds();
  }

  getTotpProgress(): number {
    return (this.getTotpRemaining() / 30) * 100;
  }

  clearSelection(): void {
    this.selectedPassword.set(null);
    this.selectedPasswordId.set(null);
    this.showDetailPassword.set(false);
  }

  toggleDetailPassword(): void {
    this.showDetailPassword.update(v => !v);
  }

  goToVault(): void {
    this.showAddForm.set(false);
    this.clearSelection();
  }
}
