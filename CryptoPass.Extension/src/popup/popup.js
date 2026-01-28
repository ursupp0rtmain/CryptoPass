// CryptoPass Extension - Popup Logic

class CryptoPassPopup {
  constructor() {
    this.currentView = 'login';
    this.vault = [];
    this.filteredItems = [];
    this.selectedItem = null;
    this.isEditing = false;
    this.currentDomain = '';

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.checkLoginState();
    await this.getCurrentTab();
  }

  bindEvents() {
    // Login
    document.getElementById('btn-connect')?.addEventListener('click', () => this.connectWallet());

    // Header buttons
    document.getElementById('btn-add')?.addEventListener('click', () => this.showAddView());
    document.getElementById('btn-generator')?.addEventListener('click', () => this.showView('generator'));
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showView('settings'));

    // Tabs
    document.querySelectorAll('.cp-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.cp-tab')));
    });

    // Search
    document.getElementById('search-input')?.addEventListener('input', (e) => this.filterItems(e.target.value));

    // Type filter
    document.getElementById('type-filter')?.addEventListener('change', (e) => this.filterByType(e.target.value));

    // Detail view
    document.getElementById('btn-back')?.addEventListener('click', () => this.showView('vault'));
    document.getElementById('btn-edit')?.addEventListener('click', () => this.editItem());
    document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteItem());

    // Edit view
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.cancelEdit());
    document.getElementById('btn-save')?.addEventListener('click', () => this.saveItem());
    document.getElementById('edit-type')?.addEventListener('change', (e) => this.renderEditFields(e.target.value));

    // Generator
    document.getElementById('btn-back-generator')?.addEventListener('click', () => this.showView('vault'));
    document.getElementById('btn-copy-generated')?.addEventListener('click', () => this.copyGeneratedPassword());
    document.getElementById('btn-regenerate')?.addEventListener('click', () => this.generatePassword());
    document.getElementById('password-length')?.addEventListener('input', (e) => this.updateLengthValue(e.target.value));
    document.getElementById('btn-use-password')?.addEventListener('click', () => this.useGeneratedPassword());

    // Generator options
    ['opt-uppercase', 'opt-lowercase', 'opt-numbers', 'opt-symbols'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.generatePassword());
    });

    // Settings
    document.getElementById('btn-back-settings')?.addEventListener('click', () => this.showView('vault'));
    document.getElementById('btn-sync')?.addEventListener('click', () => this.syncVault());
    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());

    // Add for current site
    document.getElementById('btn-add-current')?.addEventListener('click', () => this.addForCurrentSite());
  }

  async checkLoginState() {
    const state = await chrome.storage.local.get(['walletAddress', 'vault', 'masterKey']);

    if (state.walletAddress && state.masterKey) {
      this.walletAddress = state.walletAddress;
      this.vault = state.vault || [];
      this.showView('vault');
      this.updateFooter();
      this.renderVaultItems();
    } else {
      this.showView('login');
    }
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
      targetView.style.display = 'block';
    }

    // Show/hide footer
    const footer = document.getElementById('vault-footer');
    if (footer) {
      footer.style.display = viewName === 'vault' ? 'flex' : 'none';
    }

    this.currentView = viewName;

    // Initialize generator if needed
    if (viewName === 'generator') {
      this.generatePassword();
    }
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
    const btn = document.getElementById('btn-connect');
    btn.disabled = true;
    btn.innerHTML = '<i class="pi pi-spin pi-spinner"></i> Connecting...';

    try {
      // Request wallet connection via background script
      const response = await chrome.runtime.sendMessage({ action: 'connectWallet' });

      if (response.success) {
        this.walletAddress = response.address;
        await chrome.storage.local.set({
          walletAddress: response.address,
          masterKey: response.masterKey
        });

        await this.loadVault();
        this.showView('vault');
        this.updateFooter();
      } else {
        alert('Failed to connect wallet: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Make sure MetaMask is installed.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="pi pi-wallet"></i> Connect Wallet';
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

    if (this.vault.length === 0) {
      container.innerHTML = `
        <div class="cp-empty-state">
          <i class="pi pi-lock"></i>
          <p>Your vault is empty</p>
          <button class="cp-btn cp-btn-sm cp-btn-primary" onclick="cryptoPass.showAddView()">
            <i class="pi pi-plus"></i> Add Item
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = this.vault.map((item, index) => this.renderItem(item, index)).join('');
    this.bindItemEvents();
  }

  renderCurrentTabItems() {
    const container = document.getElementById('current-items');
    if (!container) return;

    const matchingItems = this.vault.filter(item =>
      item.type === 'login' && item.url && item.url.includes(this.currentDomain)
    );

    if (matchingItems.length === 0) {
      container.innerHTML = `
        <div class="cp-empty-state">
          <i class="pi pi-inbox"></i>
          <p>No logins for this website</p>
          <button class="cp-btn cp-btn-sm" id="btn-add-current">
            <i class="pi pi-plus"></i> Add Login
          </button>
        </div>
      `;
      document.getElementById('btn-add-current')?.addEventListener('click', () => this.addForCurrentSite());
      return;
    }

    document.getElementById('current-domain').textContent = `${matchingItems.length} login(s) for ${this.currentDomain}`;
    container.innerHTML = matchingItems.map((item, index) => this.renderItem(item, index)).join('');
    this.bindItemEvents();
  }

  renderItem(item, index) {
    const icons = {
      login: 'pi-globe',
      card: 'pi-credit-card',
      note: 'pi-file',
      address: 'pi-map-marker'
    };

    const subtitle = item.type === 'login' ? item.username :
                     item.type === 'card' ? `•••• ${item.cardNumber?.slice(-4) || '****'}` :
                     item.type === 'address' ? `${item.city}, ${item.country}` : '';

    return `
      <div class="cp-item" data-index="${index}" data-id="${item.id}">
        <div class="cp-item-icon">
          <i class="pi ${icons[item.type] || 'pi-key'}"></i>
        </div>
        <div class="cp-item-content">
          <div class="cp-item-title">${this.escapeHtml(item.title)}</div>
          ${subtitle ? `<div class="cp-item-subtitle">${this.escapeHtml(subtitle)}</div>` : ''}
        </div>
        <div class="cp-item-actions">
          ${item.type === 'login' ? `
            <button class="cp-item-btn" data-action="copy-user" title="Copy username">
              <i class="pi pi-user"></i>
            </button>
            <button class="cp-item-btn" data-action="copy-pass" title="Copy password">
              <i class="pi pi-key"></i>
            </button>
            <button class="cp-item-btn" data-action="autofill" title="Autofill">
              <i class="pi pi-sign-in"></i>
            </button>
          ` : `
            <button class="cp-item-btn" data-action="copy" title="Copy">
              <i class="pi pi-copy"></i>
            </button>
          `}
        </div>
      </div>
    `;
  }

  bindItemEvents() {
    document.querySelectorAll('.cp-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.cp-item-btn')) {
          const action = e.target.closest('.cp-item-btn').dataset.action;
          const index = parseInt(item.dataset.index);
          this.handleItemAction(action, index);
        } else {
          const index = parseInt(item.dataset.index);
          this.showItemDetail(index);
        }
      });
    });
  }

  handleItemAction(action, index) {
    const item = this.vault[index];
    if (!item) return;

    switch (action) {
      case 'copy-user':
        this.copyToClipboard(item.username, 'Username');
        break;
      case 'copy-pass':
        this.copyToClipboard(item.password, 'Password');
        break;
      case 'autofill':
        this.autofillCredentials(item);
        break;
      case 'copy':
        if (item.type === 'card') {
          this.copyToClipboard(item.cardNumber, 'Card number');
        } else if (item.type === 'note') {
          this.copyToClipboard(item.content, 'Note');
        }
        break;
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
          ${hasGenerator ? `<button type="button" class="cp-btn cp-btn-sm" onclick="cryptoPass.openGeneratorForField('${id}')"><i class="pi pi-refresh"></i></button>` : ''}
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
      this.vault = this.vault.filter(v => v.id !== this.selectedItem.id);
      await chrome.storage.local.set({ vault: this.vault });
      await this.syncVault();

      this.renderVaultItems();
      this.renderCurrentTabItems();
      this.showView('vault');
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
    const length = parseInt(document.getElementById('password-length')?.value || '16');
    const useUpper = document.getElementById('opt-uppercase')?.checked ?? true;
    const useLower = document.getElementById('opt-lowercase')?.checked ?? true;
    const useNumbers = document.getElementById('opt-numbers')?.checked ?? true;
    const useSymbols = document.getElementById('opt-symbols')?.checked ?? true;

    let chars = '';
    if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) chars += '0123456789';
    if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += chars[array[i] % chars.length];
    }

    document.getElementById('generated-password').value = password;
  }

  updateLengthValue(value) {
    document.getElementById('length-value').textContent = value;
    this.generatePassword();
  }

  copyGeneratedPassword() {
    const password = document.getElementById('generated-password')?.value;
    if (password) {
      this.copyToClipboard(password, 'Password');
    }
  }

  useGeneratedPassword() {
    const password = document.getElementById('generated-password')?.value;
    if (password) {
      const passwordField = document.getElementById('edit-password');
      if (passwordField) {
        passwordField.value = password;
      }
      this.showView('edit');
    }
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
    try {
      document.getElementById('footer-sync').textContent = 'Syncing...';
      const response = await chrome.runtime.sendMessage({
        action: 'syncVault',
        vault: this.vault
      });

      if (response.success) {
        document.getElementById('footer-sync').textContent = 'Synced';
      } else {
        document.getElementById('footer-sync').textContent = 'Sync failed';
      }
    } catch (error) {
      console.error('Sync error:', error);
      document.getElementById('footer-sync').textContent = 'Sync failed';
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
      document.getElementById('footer-wallet').textContent = short;
      document.getElementById('connected-wallet').textContent = short;
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
