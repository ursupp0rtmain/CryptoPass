// CryptoPass Extension - Popup Logic

class CryptoPassPopup {
  constructor() {
    this.currentView = 'login';
    this.vault = [];
    this.filteredItems = [];
    this.selectedItem = null;
    this.isEditing = false;
    this.currentDomain = '';
    this.notifications = [];
    this.currentPassword = '';
    this.passwordHistory = [];

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadNotifications();
    await this.checkLoginState();
    await this.getCurrentTab();
  }

  bindEvents() {
    // Login
    document.getElementById('btn-connect')?.addEventListener('click', () => this.connectWallet());

    // Header buttons - Add dropdown
    document.getElementById('btn-add')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleAddDropdown();
    });
    document.getElementById('add-dropdown-backdrop')?.addEventListener('click', () => this.closeAddDropdown());

    // Add dropdown items
    document.querySelectorAll('.cp-dropdown-item[data-type]').forEach(item => {
      item.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.closeAddDropdown();
        this.showAddViewWithType(type);
      });
    });

    document.getElementById('btn-profile')?.addEventListener('click', () => this.showView('settings'));
    document.getElementById('btn-notifications')?.addEventListener('click', () => this.showNotifications());

    // Bottom navigation
    document.querySelectorAll('.cp-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        if (view) this.showView(view);
      });
    });

    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => this.filterItems(e.target.value));

    // Type filter
    document.getElementById('type-filter')?.addEventListener('change', (e) => this.filterByType(e.target.value));

    // 2FA Button and Dialog
    document.getElementById('btn-2fa')?.addEventListener('click', () => this.open2FADialog());
    document.getElementById('btn-close-2fa')?.addEventListener('click', () => this.close2FADialog());
    document.querySelector('#dialog-2fa .cp-dialog-backdrop')?.addEventListener('click', () => this.close2FADialog());

    // Notifications Dialog
    document.getElementById('btn-close-notifications')?.addEventListener('click', () => this.closeNotificationsDialog());
    document.getElementById('btn-clear-notifications')?.addEventListener('click', () => this.clearAllNotifications());
    document.querySelector('#dialog-notifications .cp-dialog-backdrop')?.addEventListener('click', () => this.closeNotificationsDialog());

    // Detail view
    document.getElementById('btn-back')?.addEventListener('click', () => this.showView('vault'));
    document.getElementById('btn-edit')?.addEventListener('click', () => this.editItem());
    document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteItem());

    // Edit view
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.cancelEdit());
    document.getElementById('btn-save')?.addEventListener('click', () => this.saveItem());
    document.getElementById('edit-type')?.addEventListener('change', (e) => this.renderEditFields(e.target.value));

    // Generator
    document.getElementById('btn-copy-generated')?.addEventListener('click', () => this.copyGeneratedPassword());
    document.getElementById('btn-regenerate')?.addEventListener('click', () => this.generatePassword());
    document.getElementById('password-length')?.addEventListener('input', () => this.onLengthChange());
    document.getElementById('btn-clear-history')?.addEventListener('click', () => this.clearPasswordHistory());

    // Generator options - all trigger regeneration
    ['opt-uppercase', 'opt-lowercase', 'opt-numbers', 'opt-symbols', 'opt-avoid-ambiguous'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.generatePassword());
    });
    ['min-numbers', 'min-special'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.generatePassword());
    });

    // Settings
    document.getElementById('btn-sync')?.addEventListener('click', () => this.syncVault());
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    document.getElementById('auto-lock')?.addEventListener('change', (e) => this.saveAutoLockSetting(e.target.value));

    // Share
    document.getElementById('btn-send-share')?.addEventListener('click', () => this.sendShare());

    // Event delegation for dynamically created generator buttons
    document.addEventListener('click', (e) => {
      const generatorBtn = e.target.closest('.cp-generator-btn');
      if (generatorBtn) {
        const fieldId = generatorBtn.dataset.field;
        if (fieldId) {
          this.openGeneratorForField(fieldId);
        }
      }
    });
  }

  // Add Dropdown
  toggleAddDropdown() {
    const dropdown = document.getElementById('add-dropdown');
    const backdrop = document.getElementById('add-dropdown-backdrop');
    const isVisible = dropdown.style.display !== 'none';

    dropdown.style.display = isVisible ? 'none' : 'block';
    backdrop.style.display = isVisible ? 'none' : 'block';
  }

  closeAddDropdown() {
    document.getElementById('add-dropdown').style.display = 'none';
    document.getElementById('add-dropdown-backdrop').style.display = 'none';
  }

  showAddViewWithType(type) {
    this.isEditing = false;
    this.selectedItem = null;

    document.getElementById('edit-title').textContent = 'New Item';
    document.getElementById('edit-type').value = type;
    document.getElementById('edit-type').disabled = false;

    this.renderEditFields(type);
    this.showView('edit');
  }

  // 2FA Dialog
  open2FADialog() {
    this.render2FAList();
    document.getElementById('dialog-2fa').style.display = 'block';
    this.start2FATimer();
  }

  close2FADialog() {
    document.getElementById('dialog-2fa').style.display = 'none';
    this.stop2FATimer();
  }

  start2FATimer() {
    this.totpTimerInterval = setInterval(() => {
      this.render2FAList();
    }, 1000);
  }

  stop2FATimer() {
    if (this.totpTimerInterval) {
      clearInterval(this.totpTimerInterval);
      this.totpTimerInterval = null;
    }
  }

  get2FAItems() {
    return this.vault.filter(item => item.type === 'login' && item.totp);
  }

  render2FAList() {
    const items = this.get2FAItems();
    const container = document.getElementById('2fa-list');
    const emptyState = document.getElementById('2fa-empty');
    const badge = document.getElementById('2fa-count');

    // Update badge
    if (items.length > 0) {
      badge.textContent = items.length;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }

    if (items.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    const remaining = this.getTotpRemaining();
    const progress = (remaining / 30) * 100;

    container.innerHTML = items.map(item => `
      <div class="cp-2fa-item" data-id="${item.id}">
        <div class="cp-2fa-header">
          <div class="cp-2fa-title">
            <i class="pi pi-globe"></i>
            <span>${this.escapeHtml(item.title)}</span>
          </div>
          ${item.username ? `<div class="cp-2fa-username">${this.escapeHtml(item.username)}</div>` : ''}
        </div>
        <div class="cp-2fa-code-container">
          <div class="cp-2fa-code">${this.generateTotpCode(item.totp)}</div>
          <div class="cp-2fa-timer">
            <div class="timer-bar" style="width: ${progress}%"></div>
          </div>
          <div class="cp-2fa-countdown">${remaining}s</div>
        </div>
      </div>
    `).join('');

    // Bind click to copy
    container.querySelectorAll('.cp-2fa-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const item = this.vault.find(v => v.id === id);
        if (item?.totp) {
          const code = this.generateTotpCode(item.totp);
          this.copyToClipboard(code, '2FA Code');
          this.showToast('2FA Code copied');
        }
      });
    });
  }

  getTotpRemaining() {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  }

  generateTotpCode(secret) {
    // Simple TOTP implementation
    try {
      const time = Math.floor(Date.now() / 1000 / 30);
      // This is a simplified version - real TOTP needs proper HMAC-SHA1
      // For now, return a placeholder that changes every 30 seconds
      const hash = this.simpleHash(secret + time);
      return hash.toString().slice(0, 6).padStart(6, '0');
    } catch {
      return '------';
    }
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async checkLoginState() {
    const state = await chrome.storage.local.get(['walletAddress', 'vault', 'masterKey']);

    if (state.walletAddress && state.masterKey) {
      this.walletAddress = state.walletAddress;
      this.vault = state.vault || [];
      this.showView('vault');
      this.updateFooter();
      this.renderVaultItems();
      this.update2FABadge();
      await this.loadAutoLockSetting();
    } else {
      this.showView('login');
    }
  }

  async loadAutoLockSetting() {
    if (!this.walletAddress) return;
    const key = `autoLock_${this.walletAddress}`;
    const data = await chrome.storage.local.get([key]);
    const autoLockValue = data[key] ?? '5'; // Default to 5 min
    const select = document.getElementById('auto-lock');
    if (select) {
      select.value = autoLockValue;
    }
  }

  async saveAutoLockSetting(value) {
    if (!this.walletAddress) return;
    const key = `autoLock_${this.walletAddress}`;
    await chrome.storage.local.set({ [key]: value });
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        this.currentDomain = url.hostname;
        document.getElementById('current-domain')?.textContent &&
          (document.getElementById('current-domain').textContent = this.currentDomain);
        this.renderCurrentTabItems();
      }
    } catch (e) {
      console.error('Error getting current tab:', e);
    }
  }

  showView(viewName) {
    // Hide all views
    document.querySelectorAll('.cp-view').forEach(view => {
      view.style.display = 'none';
    });

    // Show target view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.style.display = 'flex';
    }

    // Update bottom navigation active state
    document.querySelectorAll('.cp-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      }
    });

    this.currentView = viewName;

    // Initialize generator if needed
    if (viewName === 'generator') {
      this.generatePassword();
    }

    // Update counts
    if (viewName === 'vault') {
      this.updateCounts();
      this.update2FABadge();
      this.updateNotificationBadge();
    }

    // Populate share select
    if (viewName === 'share') {
      this.populateShareSelect();
    }
  }

  showNotifications() {
    // Open notifications dialog
    const dialog = document.getElementById('dialog-notifications');
    if (dialog) {
      dialog.style.display = 'block';
      this.renderNotifications();
      this.markNotificationsAsRead();
    }
  }

  closeNotificationsDialog() {
    const dialog = document.getElementById('dialog-notifications');
    if (dialog) {
      dialog.style.display = 'none';
    }
  }

  renderNotifications() {
    const container = document.getElementById('notifications-list');
    const emptyState = document.getElementById('notifications-empty');
    
    if (!container || !emptyState) return;
    
    const notifications = this.getNotifications();
    
    if (notifications.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }
    
    container.style.display = 'flex';
    emptyState.style.display = 'none';
    
    container.innerHTML = notifications.map(notification => `
      <div class="cp-notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
        <div class="cp-notification-icon ${notification.type}">
          <i class="pi ${this.getNotificationIcon(notification.type)}"></i>
        </div>
        <div class="cp-notification-content">
          <h4>${this.escapeHtml(notification.title)}</h4>
          <p>${this.escapeHtml(notification.message)}</p>
          <span class="time">${this.formatTime(notification.createdAt)}</span>
        </div>
        <button class="cp-notification-close" data-id="${notification.id}">
          <i class="pi pi-times"></i>
        </button>
      </div>
    `).join('');
    
    // Bind events
    container.querySelectorAll('.cp-notification-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.cp-notification-close')) {
          const id = item.dataset.id;
          this.onNotificationClick(id);
        }
      });
    });
    
    container.querySelectorAll('.cp-notification-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        this.removeNotification(id);
      });
    });
  }

  getNotifications() {
    // Get notifications from storage or return demo data
    // In production, this would sync with the main app
    return this.notifications || [];
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'share_request':
      case 'share':
        return 'pi-share-alt';
      case 'share_accepted':
        return 'pi-check-circle';
      case 'share_rejected':
        return 'pi-times-circle';
      default:
        return 'pi-info-circle';
    }
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  onNotificationClick(id) {
    const notification = this.notifications?.find(n => n.id === id);
    if (notification?.type === 'share_request') {
      // Handle share request click
      console.log('Share request clicked:', notification);
    }
    this.closeNotificationsDialog();
  }

  removeNotification(id) {
    this.notifications = (this.notifications || []).filter(n => n.id !== id);
    this.saveNotifications();
    this.renderNotifications();
    this.updateNotificationBadge();
  }

  clearAllNotifications() {
    this.notifications = [];
    this.saveNotifications();
    this.renderNotifications();
    this.updateNotificationBadge();
  }

  markNotificationsAsRead() {
    if (this.notifications) {
      this.notifications = this.notifications.map(n => ({ ...n, read: true }));
      this.saveNotifications();
      this.updateNotificationBadge();
    }
  }

  async loadNotifications() {
    try {
      const stored = await chrome.storage.local.get(['notifications']);
      this.notifications = stored.notifications || [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  async saveNotifications() {
    try {
      await chrome.storage.local.set({ notifications: this.notifications || [] });
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  getNotificationCount() {
    // Count unread notifications
    return (this.notifications || []).filter(n => !n.read).length;
  }

  updateNotificationBadge() {
    const badge = document.getElementById('notification-count');
    if (!badge) return; // Element doesn't exist in current view
    
    const count = this.getNotificationCount();
    
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  update2FABadge() {
    const items = this.get2FAItems();
    const badge = document.getElementById('2fa-count');
    if (badge) {
      if (items.length > 0) {
        badge.textContent = items.length;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  populateShareSelect() {
    const select = document.getElementById('share-item-select');
    if (!select) return;

    const logins = this.vault.filter(item => item.type === 'login');

    select.innerHTML = '<option value="">Choose a login...</option>' +
      logins.map(item => `<option value="${item.id}">${this.escapeHtml(item.title)}</option>`).join('');
  }

  async sendShare() {
    const selectEl = document.getElementById('share-item-select');
    const recipientEl = document.getElementById('share-recipient');

    const itemId = selectEl?.value;
    const recipient = recipientEl?.value?.trim();

    if (!itemId) {
      this.showToast('Please select an item', 'error');
      return;
    }

    if (!recipient || !recipient.startsWith('0x')) {
      this.showToast('Please enter a valid wallet address', 'error');
      return;
    }

    const item = this.vault.find(v => v.id === itemId);
    if (!item) {
      this.showToast('Item not found', 'error');
      return;
    }

    // For now, just show a message - actual sharing would need web app integration
    this.showToast('Sharing feature requires web app');
  }

  updateCounts() {
    const vaultCount = this.vault.length;
    const vaultCountEl = document.getElementById('vault-count');
    if (vaultCountEl) vaultCountEl.textContent = vaultCount;

    const settingsCountEl = document.getElementById('settings-vault-count');
    if (settingsCountEl) settingsCountEl.textContent = vaultCount;
  }

  switchTab(tabElement) {
    if (!tabElement) return;

    // Update tab states
    document.querySelectorAll('.cp-tab').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');

    // Update content visibility
    const tabId = tabElement.dataset.tab;
    document.querySelectorAll('.cp-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabId)?.classList.add('active');
  }

  async connectWallet() {
    console.log('Connect wallet clicked');
    const btn = document.getElementById('btn-connect');
    if (!btn) {
      console.error('Connect button not found');
      return;
    }
    
    this.hideError();
    btn.disabled = true;
    btn.innerHTML = '<i class="pi pi-spin pi-spinner"></i> <span>Connecting...</span>';

    try {
      console.log('Sending connectWallet message to background');
      // Request wallet connection via background script
      const response = await chrome.runtime.sendMessage({ action: 'connectWallet' });
      console.log('Received response:', response);

      if (response.success) {
        this.walletAddress = response.address;
        await this.loadVault();
        this.showView('vault');
        this.updateFooter();
      } else if (response.error === 'opening_login') {
        // Web app login page opened - credentials will sync automatically after login
        console.log('Opening login page, closing popup');
        window.close();
      } else {
        console.error('Connect wallet failed:', response.error);
        this.showError('Failed to connect wallet: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Connection error:', error);
      this.showError('Failed to connect. Error: ' + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="pi pi-sign-in"></i> <span>Connect Wallet</span>';
      }
    }
  }

  showError(message) {
    // Display error in the UI instead of using alert
    console.error('Error:', message);
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.style.display = 'flex';
    }
  }

  hideError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  async loadVault() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'loadVault' });
      if (response.success) {
        this.vault = response.vault || [];
        await chrome.storage.local.set({ vault: this.vault });
        this.renderVaultItems();
        this.renderCurrentTabItems();
      }
    } catch (error) {
      console.error('Error loading vault:', error);
    }
  }

  renderVaultItems() {
    const container = document.getElementById('vault-items');
    if (!container) return;

    // Update counts
    this.updateCounts();

    if (this.vault.length === 0) {
      container.innerHTML = `
        <div class="cp-empty-state">
          <i class="pi pi-lock"></i>
          <p>Your vault is empty</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.vault.map((item, index) => this.renderItem(item, index)).join('');
    this.bindItemEvents();
  }

  renderCurrentTabItems() {
    // No longer used - autofill suggestions removed
  }

  renderItem(item, index) {
    const icons = {
      login: 'pi-globe',
      card: 'pi-credit-card',
      note: 'pi-file',
      identity: 'pi-user',
      address: 'pi-map-marker'
    };

    const subtitle = item.type === 'login' ? item.username :
                     item.type === 'card' ? `•••• ${item.cardNumber?.slice(-4) || '****'}` :
                     item.type === 'identity' ? item.firstName || item.email :
                     item.type === 'address' ? `${item.city || ''}, ${item.country || ''}` : '';

    return `
      <div class="cp-item" data-index="${index}" data-id="${item.id}">
        <div class="cp-item-icon ${item.type}">
          <i class="pi ${icons[item.type] || 'pi-key'}"></i>
        </div>
        <div class="cp-item-content">
          <div class="cp-item-title">${this.escapeHtml(item.title)}</div>
          ${subtitle ? `<div class="cp-item-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
        </div>
        <div class="cp-item-actions">
          ${item.type === 'login' ? `
            <button class="cp-fill-btn" data-action="autofill" title="Fill">Fill</button>
            <button class="cp-item-btn" data-action="copy-pass" title="Copy password">
              <i class="pi pi-copy"></i>
            </button>
            <button class="cp-item-btn" data-action="menu" title="More options">
              <i class="pi pi-ellipsis-v"></i>
            </button>
          ` : item.type === 'card' ? `
            <button class="cp-fill-btn" data-action="fill-card" title="Fill">Fill</button>
            <button class="cp-item-btn" data-action="copy" title="Copy">
              <i class="pi pi-copy"></i>
            </button>
            <button class="cp-item-btn" data-action="menu" title="More options">
              <i class="pi pi-ellipsis-v"></i>
            </button>
          ` : `
            <button class="cp-item-btn" data-action="copy" title="Copy">
              <i class="pi pi-copy"></i>
            </button>
            <button class="cp-item-btn" data-action="menu" title="More options">
              <i class="pi pi-ellipsis-v"></i>
            </button>
          `}
        </div>
      </div>
    `;
  }

  bindItemEvents() {
    document.querySelectorAll('.cp-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Check for fill button
        if (e.target.closest('.cp-fill-btn')) {
          e.stopPropagation();
          const action = e.target.closest('.cp-fill-btn').dataset.action;
          const index = parseInt(item.dataset.index);
          this.handleItemAction(action, index);
          return;
        }
        // Check for other action buttons
        if (e.target.closest('.cp-item-btn')) {
          e.stopPropagation();
          const action = e.target.closest('.cp-item-btn').dataset.action;
          const index = parseInt(item.dataset.index);
          this.handleItemAction(action, index);
          return;
        }
        // Otherwise show detail
        const index = parseInt(item.dataset.index);
        this.showItemDetail(index);
      });
    });
  }

  handleItemAction(action, index) {
    const item = this.vault[index];
    if (!item) return;

    switch (action) {
      case 'copy-user':
        this.copyToClipboard(item.username, 'Username');
        this.showToast('Username copied');
        break;
      case 'copy-pass':
        this.copyToClipboard(item.password, 'Password');
        this.showToast('Password copied');
        break;
      case 'autofill':
        this.autofillCredentials(item);
        break;
      case 'fill-card':
        this.autofillCard(item);
        break;
      case 'copy':
        if (item.type === 'card') {
          this.copyToClipboard(item.cardNumber, 'Card number');
          this.showToast('Card number copied');
        } else if (item.type === 'note') {
          this.copyToClipboard(item.content, 'Note');
          this.showToast('Note copied');
        }
        break;
      case 'menu':
        this.showItemDetail(index);
        break;
    }
  }

  showToast(message, type = 'success') {
    // Remove existing toast
    document.querySelector('.cp-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = `cp-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }

  async autofillCard(item) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'autofillCard',
          cardNumber: item.cardNumber,
          cardholderName: item.cardholderName,
          expirationMonth: item.expirationMonth,
          expirationYear: item.expirationYear,
          cvv: item.cvv
        });
        window.close();
      }
    } catch (error) {
      console.error('Card autofill error:', error);
    }
  }

  showItemDetail(index) {
    this.selectedItem = this.vault[index];
    if (!this.selectedItem) return;

    document.getElementById('detail-title').textContent = this.selectedItem.title;

    const content = document.getElementById('detail-content');
    content.innerHTML = this.renderDetailFields(this.selectedItem);

    // Bind copy buttons
    content.querySelectorAll('.cp-icon-btn[data-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.copy;
        this.copyToClipboard(this.selectedItem[field], field);
      });
    });

    this.showView('detail');
  }

  renderDetailFields(item) {
    const fields = [];

    if (item.type === 'login') {
      fields.push(this.createDetailField('Username', item.username, 'username'));
      fields.push(this.createDetailField('Password', '••••••••', 'password', true));
      if (item.url) {
        fields.push(this.createDetailField('URL', item.url, null, false, true));
      }
      if (item.totp) {
        fields.push(this.createDetailField('2FA Code', this.getTotpCode(item.totp), 'totp'));
      }
    } else if (item.type === 'card') {
      fields.push(this.createDetailField('Cardholder', item.cardholderName));
      fields.push(this.createDetailField('Card Number', '•••• •••• •••• ' + (item.cardNumber?.slice(-4) || '****'), 'cardNumber'));
      if (item.expirationMonth && item.expirationYear) {
        fields.push(this.createDetailField('Expiration', `${item.expirationMonth}/${item.expirationYear}`));
      }
      if (item.cvv) {
        fields.push(this.createDetailField('CVV', '•••', 'cvv'));
      }
    } else if (item.type === 'note') {
      fields.push(this.createDetailField('Content', item.content, 'content'));
    } else if (item.type === 'address') {
      if (item.firstName || item.lastName) {
        fields.push(this.createDetailField('Name', `${item.firstName || ''} ${item.lastName || ''}`.trim()));
      }
      const addressLines = [item.addressLine1, item.addressLine2, `${item.city}, ${item.state || ''} ${item.postalCode || ''}`, item.country].filter(Boolean);
      fields.push(this.createDetailField('Address', addressLines.join('\n')));
    }

    if (item.notes) {
      fields.push(this.createDetailField('Notes', item.notes));
    }

    return fields.join('');
  }

  createDetailField(label, value, copyField = null, isPassword = false, isLink = false) {
    return `
      <div class="cp-detail-field">
        <span class="cp-detail-label">${label}</span>
        <div class="cp-detail-value">
          ${isLink ? `<a href="${this.escapeHtml(value)}" target="_blank">${this.escapeHtml(value)}</a>` : `<span>${this.escapeHtml(value)}</span>`}
          ${copyField ? `<button class="cp-icon-btn" data-copy="${copyField}" title="Copy"><i class="pi pi-copy"></i></button>` : ''}
        </div>
      </div>
    `;
  }

  showAddView(item = null) {
    this.isEditing = !!item;
    this.selectedItem = item;

    document.getElementById('edit-title').textContent = item ? 'Edit Item' : 'Add Item';
    document.getElementById('edit-type').value = item?.type || 'login';
    document.getElementById('edit-type').disabled = !!item;

    this.renderEditFields(item?.type || 'login');
    this.showView('edit');
  }

  renderEditFields(type) {
    const container = document.getElementById('edit-fields');
    let html = '';

    html += this.createFormField('title', 'Name', 'text', this.selectedItem?.title || '');

    if (type === 'login') {
      html += this.createFormField('username', 'Username', 'text', this.selectedItem?.username || '');
      html += this.createFormField('password', 'Password', 'password', this.selectedItem?.password || '', true);
      html += this.createFormField('url', 'URL', 'url', this.selectedItem?.url || this.currentDomain ? `https://${this.currentDomain}` : '');
      html += this.createFormField('totp', 'TOTP Secret (Optional)', 'text', this.selectedItem?.totp || '');
    } else if (type === 'card') {
      html += this.createFormField('cardholderName', 'Cardholder Name', 'text', this.selectedItem?.cardholderName || '');
      html += this.createFormField('cardNumber', 'Card Number', 'text', this.selectedItem?.cardNumber || '');
      html += `
        <div class="cp-form-group">
          <label>Expiration</label>
          <div class="cp-input-group">
            <input type="text" class="cp-input" id="edit-expirationMonth" placeholder="MM" maxlength="2" value="${this.selectedItem?.expirationMonth || ''}">
            <input type="text" class="cp-input" id="edit-expirationYear" placeholder="YYYY" maxlength="4" value="${this.selectedItem?.expirationYear || ''}">
          </div>
        </div>
      `;
      html += this.createFormField('cvv', 'CVV', 'password', this.selectedItem?.cvv || '');
    } else if (type === 'note') {
      html += `
        <div class="cp-form-group">
          <label>Content</label>
          <textarea class="cp-input" id="edit-content" rows="6">${this.escapeHtml(this.selectedItem?.content || '')}</textarea>
        </div>
      `;
    } else if (type === 'address') {
      html += this.createFormField('firstName', 'First Name', 'text', this.selectedItem?.firstName || '');
      html += this.createFormField('lastName', 'Last Name', 'text', this.selectedItem?.lastName || '');
      html += this.createFormField('addressLine1', 'Address Line 1', 'text', this.selectedItem?.addressLine1 || '');
      html += this.createFormField('addressLine2', 'Address Line 2', 'text', this.selectedItem?.addressLine2 || '');
      html += this.createFormField('city', 'City', 'text', this.selectedItem?.city || '');
      html += this.createFormField('state', 'State/Province', 'text', this.selectedItem?.state || '');
      html += this.createFormField('postalCode', 'Postal Code', 'text', this.selectedItem?.postalCode || '');
      html += this.createFormField('country', 'Country', 'text', this.selectedItem?.country || '');
    }

    html += `
      <div class="cp-form-group">
        <label>Notes (Optional)</label>
        <textarea class="cp-input" id="edit-notes" rows="3">${this.escapeHtml(this.selectedItem?.notes || '')}</textarea>
      </div>
    `;

    container.innerHTML = html;
  }

  createFormField(id, label, type, value, hasGenerator = false) {
    return `
      <div class="cp-form-group">
        <label>${label}</label>
        <div class="cp-input-group">
          <input type="${type}" class="cp-input" id="edit-${id}" value="${this.escapeHtml(value)}">
          ${hasGenerator ? `<button type="button" class="cp-btn cp-btn-sm cp-generator-btn" data-field="${id}"><i class="pi pi-refresh"></i></button>` : ''}
        </div>
      </div>
    `;
  }

  async saveItem() {
    const type = document.getElementById('edit-type').value;
    const item = {
      id: this.selectedItem?.id || crypto.randomUUID(),
      type,
      title: document.getElementById('edit-title')?.value || '',
      notes: document.getElementById('edit-notes')?.value || '',
      createdAt: this.selectedItem?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    // Add type-specific fields
    if (type === 'login') {
      item.username = document.getElementById('edit-username')?.value || '';
      item.password = document.getElementById('edit-password')?.value || '';
      item.url = document.getElementById('edit-url')?.value || '';
      item.totp = document.getElementById('edit-totp')?.value || '';
    } else if (type === 'card') {
      item.cardholderName = document.getElementById('edit-cardholderName')?.value || '';
      item.cardNumber = document.getElementById('edit-cardNumber')?.value || '';
      item.expirationMonth = document.getElementById('edit-expirationMonth')?.value || '';
      item.expirationYear = document.getElementById('edit-expirationYear')?.value || '';
      item.cvv = document.getElementById('edit-cvv')?.value || '';
    } else if (type === 'note') {
      item.content = document.getElementById('edit-content')?.value || '';
    } else if (type === 'address') {
      item.firstName = document.getElementById('edit-firstName')?.value || '';
      item.lastName = document.getElementById('edit-lastName')?.value || '';
      item.addressLine1 = document.getElementById('edit-addressLine1')?.value || '';
      item.addressLine2 = document.getElementById('edit-addressLine2')?.value || '';
      item.city = document.getElementById('edit-city')?.value || '';
      item.state = document.getElementById('edit-state')?.value || '';
      item.postalCode = document.getElementById('edit-postalCode')?.value || '';
      item.country = document.getElementById('edit-country')?.value || '';
    }

    if (this.isEditing) {
      const index = this.vault.findIndex(v => v.id === item.id);
      if (index !== -1) {
        this.vault[index] = item;
      }
    } else {
      this.vault.push(item);
    }

    await chrome.storage.local.set({ vault: this.vault });
    await this.syncVault();

    this.renderVaultItems();
    this.renderCurrentTabItems();
    this.showView('vault');
  }

  cancelEdit() {
    this.selectedItem = null;
    this.isEditing = false;
    this.showView('vault');
  }

  editItem() {
    this.showAddView(this.selectedItem);
  }

  async deleteItem() {
    if (!this.selectedItem) return;

    if (confirm('Are you sure you want to delete this item?')) {
      const deletedId = this.selectedItem.id;

      // Optimistic update: Remove from UI immediately
      this.vault = this.vault.filter(v => v.id !== deletedId);
      this.selectedItem = null;
      this.renderVaultItems();
      this.renderCurrentTabItems();
      this.showView('vault');

      // Save and sync in background
      try {
        await chrome.storage.local.set({ vault: this.vault });
        await this.syncVault();
      } catch (error) {
        console.error('Error syncing after delete:', error);
        // Could reload vault on error, but UI is already updated
      }
    }
  }

  filterItems(query) {
    const items = document.querySelectorAll('.cp-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
      const title = item.querySelector('.cp-item-title')?.textContent.toLowerCase() || '';
      const subtitle = item.querySelector('.cp-item-subtitle')?.textContent.toLowerCase() || '';

      if (title.includes(lowerQuery) || subtitle.includes(lowerQuery)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  filterByType(type) {
    this.renderVaultItems();
    if (type === 'all') return;

    const items = document.querySelectorAll('#vault-items .cp-item');
    items.forEach((item, index) => {
      if (this.vault[index]?.type !== type) {
        item.style.display = 'none';
      }
    });
  }

  addForCurrentSite() {
    this.selectedItem = null;
    this.isEditing = false;
    this.showAddView();
  }

  // Password Generator
  generatePassword() {
    const lengthInput = document.getElementById('password-length');
    let length = parseInt(lengthInput?.value || '52');
    
    // Validate length
    const validationMsg = document.getElementById('length-validation');
    if (length < 20 || length > 128) {
      if (validationMsg) validationMsg.style.display = 'block';
      length = Math.max(20, Math.min(128, length));
    } else {
      if (validationMsg) validationMsg.style.display = 'none';
    }

    const useUpper = document.getElementById('opt-uppercase')?.checked ?? true;
    const useLower = document.getElementById('opt-lowercase')?.checked ?? true;
    const useNumbers = document.getElementById('opt-numbers')?.checked ?? true;
    const useSymbols = document.getElementById('opt-symbols')?.checked ?? true;
    const avoidAmbiguous = document.getElementById('opt-avoid-ambiguous')?.checked ?? false;
    const minNumbers = parseInt(document.getElementById('min-numbers')?.value || '0');
    const minSpecial = parseInt(document.getElementById('min-special')?.value || '0');

    // Character sets
    let upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    let numberChars = '0123456789';
    let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Remove ambiguous characters if option is checked
    if (avoidAmbiguous) {
      upperChars = upperChars.replace(/[O0IL1]/g, '');
      lowerChars = lowerChars.replace(/[ol1]/g, '');
      numberChars = numberChars.replace(/[01]/g, '');
    }

    let chars = '';
    if (useUpper) chars += upperChars;
    if (useLower) chars += lowerChars;
    if (useNumbers) chars += numberChars;
    if (useSymbols) chars += symbolChars;

    if (!chars) chars = lowerChars;

    // Build password with minimum requirements
    let password = [];
    const getRandomChar = (charSet) => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return charSet[array[0] % charSet.length];
    };

    // Add minimum required numbers
    if (useNumbers && minNumbers > 0) {
      for (let i = 0; i < minNumbers && password.length < length; i++) {
        password.push(getRandomChar(numberChars));
      }
    }

    // Add minimum required special chars
    if (useSymbols && minSpecial > 0) {
      for (let i = 0; i < minSpecial && password.length < length; i++) {
        password.push(getRandomChar(symbolChars));
      }
    }

    // Fill remaining with random chars from all enabled sets
    while (password.length < length) {
      password.push(getRandomChar(chars));
    }

    // Shuffle the password array
    for (let i = password.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      const j = array[0] % (i + 1);
      [password[i], password[j]] = [password[j], password[i]];
    }

    this.currentPassword = password.join('');
    this.renderColoredPassword(this.currentPassword);
  }

  renderColoredPassword(password) {
    const display = document.getElementById('generated-password-display');
    if (!display) return;

    let html = '';
    for (const char of password) {
      let charClass = 'char-lower';
      if (/[A-Z]/.test(char)) charClass = 'char-upper';
      else if (/[0-9]/.test(char)) charClass = 'char-number';
      else if (/[^a-zA-Z0-9]/.test(char)) charClass = 'char-symbol';
      html += `<span class="${charClass}">${this.escapeHtml(char)}</span>`;
    }
    display.innerHTML = html;
  }

  onLengthChange() {
    const lengthInput = document.getElementById('password-length');
    const validationMsg = document.getElementById('length-validation');
    const value = parseInt(lengthInput?.value || '52');
    
    if (value < 20 || value > 128) {
      if (validationMsg) validationMsg.style.display = 'block';
    } else {
      if (validationMsg) validationMsg.style.display = 'none';
    }
    this.generatePassword();
  }

  copyGeneratedPassword() {
    if (this.currentPassword) {
      this.copyToClipboard(this.currentPassword, 'Password');
      this.addToHistory(this.currentPassword);
    }
  }

  addToHistory(password) {
    // Don't add duplicates
    if (this.passwordHistory.some(h => h.password === password)) return;

    this.passwordHistory.unshift({
      password,
      timestamp: Date.now()
    });

    // Keep max 20 items
    if (this.passwordHistory.length > 20) {
      this.passwordHistory.pop();
    }

    this.renderPasswordHistory();
  }

  renderPasswordHistory() {
    const container = document.getElementById('password-history');
    const emptyState = document.getElementById('history-empty');

    if (!container) return;

    if (this.passwordHistory.length === 0) {
      container.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = this.passwordHistory.map((item, index) => {
      const timeAgo = this.formatTimeAgo(item.timestamp);
      const truncated = item.password.length > 30 
        ? item.password.substring(0, 30) + '...' 
        : item.password;
      return `
        <div class="cp-history-item" data-index="${index}">
          <span class="cp-history-password">${this.escapeHtml(truncated)}</span>
          <span class="cp-history-time">${timeAgo}</span>
          <button class="cp-history-copy" data-password="${this.escapeHtml(item.password)}" title="Copy">
            <i class="pi pi-copy"></i>
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers for copy buttons
    container.querySelectorAll('.cp-history-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const password = btn.dataset.password;
        this.copyToClipboard(password, 'Password');
      });
    });
  }

  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  }

  clearPasswordHistory() {
    this.passwordHistory = [];
    this.renderPasswordHistory();
  }

  openGeneratorForField(fieldId) {
    this.showView('generator');
    this.targetField = fieldId;
  }

  // Clipboard
  copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification
      console.log(`${label} copied to clipboard`);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // Autofill
  async autofillCredentials(item) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'autofill',
          username: item.username,
          password: item.password
        });
        window.close();
      }
    } catch (error) {
      console.error('Autofill error:', error);
    }
  }

  // Sync
  async syncVault() {
    const syncBtn = document.getElementById('btn-sync');
    try {
      if (syncBtn) syncBtn.innerHTML = '<i class="pi pi-spin pi-spinner"></i> Syncing...';
      const response = await chrome.runtime.sendMessage({
        action: 'syncVault',
        vault: this.vault
      });

      if (response?.success) {
        if (syncBtn) syncBtn.innerHTML = '<i class="pi pi-check"></i> Synced';
        setTimeout(() => {
          if (syncBtn) syncBtn.innerHTML = '<i class="pi pi-sync"></i> Sync Now';
        }, 2000);
      } else {
        if (syncBtn) syncBtn.innerHTML = '<i class="pi pi-times"></i> Sync failed';
      }
    } catch (error) {
      console.error('Sync error:', error);
      if (syncBtn) syncBtn.innerHTML = '<i class="pi pi-times"></i> Sync failed';
    }
  }

  // Logout
  async logout() {
    await chrome.storage.local.remove(['walletAddress', 'vault', 'masterKey']);
    this.vault = [];
    this.walletAddress = null;
    this.showView('login');
  }

  updateFooter() {
    if (this.walletAddress) {
      const short = `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;
      const initials = this.walletAddress.slice(2, 4).toUpperCase();

      const connectedWallet = document.getElementById('connected-wallet');
      if (connectedWallet) connectedWallet.textContent = short;

      const avatarInitials = document.getElementById('avatar-initials');
      if (avatarInitials) avatarInitials.textContent = initials;

      const settingsVaultCount = document.getElementById('settings-vault-count');
      if (settingsVaultCount) settingsVaultCount.textContent = this.vault.length;
    }
  }

  // TOTP
  getTotpCode(secret) {
    // Simplified TOTP - would need proper implementation
    return '------';
  }

  // Utils
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }
}

// Initialize
const cryptoPass = new CryptoPassPopup();
