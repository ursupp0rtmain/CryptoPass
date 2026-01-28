// CryptoPass Extension - Storage Service
// Migrated from Pinata to local storage with Ceramic sync via web app

class StorageService {
  constructor() {
    this.vaultMetadataKey = 'cryptopass_vault_metadata';
  }

  // Local storage operations
  async saveLocal(key, value) {
    return chrome.storage.local.set({ [key]: value });
  }

  async getLocal(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  }

  async removeLocal(key) {
    return chrome.storage.local.remove([key]);
  }

  async clearLocal() {
    return chrome.storage.local.clear();
  }

  // Vault operations
  async saveVault(vault) {
    await this.saveLocal('vault', vault);
  }

  async getVault() {
    return (await this.getLocal('vault')) || [];
  }

  async addItem(item) {
    const vault = await this.getVault();
    vault.push(item);
    await this.saveVault(vault);
    return vault;
  }

  async updateItem(id, updates) {
    const vault = await this.getVault();
    const index = vault.findIndex((item) => item.id === id);
    if (index !== -1) {
      vault[index] = { ...vault[index], ...updates, updatedAt: Date.now() };
      await this.saveVault(vault);
    }
    return vault;
  }

  async deleteItem(id) {
    const vault = await this.getVault();
    const filtered = vault.filter((item) => item.id !== id);
    await this.saveVault(filtered);
    return filtered;
  }

  async findItemsByDomain(domain) {
    const vault = await this.getVault();
    return vault.filter((item) => item.type === 'login' && item.url && item.url.includes(domain));
  }

  // Session state
  async saveSession(walletAddress, masterKey) {
    await chrome.storage.local.set({
      walletAddress,
      masterKey,
      sessionStart: Date.now(),
    });
  }

  async getSession() {
    const result = await chrome.storage.local.get([
      'walletAddress',
      'masterKey',
      'sessionStart',
      'ceramic_did',
    ]);
    return result;
  }

  async clearSession() {
    await chrome.storage.local.remove([
      'walletAddress',
      'masterKey',
      'sessionStart',
      'ceramic_session',
      'ceramic_did',
    ]);
  }

  // Settings
  async saveSettings(settings) {
    const current = await this.getSettings();
    await this.saveLocal('settings', { ...current, ...settings });
  }

  async getSettings() {
    return (
      (await this.getLocal('settings')) || {
        autoLockMinutes: 5,
        autoFill: true,
        showNotifications: true,
      }
    );
  }

  // Vault metadata (for sync status)
  async saveVaultMetadata(metadata) {
    const allMetadata = await this.getAllVaultMetadata();
    allMetadata[metadata.walletAddress] = metadata;
    await this.saveLocal(this.vaultMetadataKey, allMetadata);
  }

  async getVaultMetadata() {
    return await this.getLocal(this.vaultMetadataKey);
  }

  async getVaultMetadataForWallet(walletAddress) {
    const allMetadata = await this.getAllVaultMetadata();
    return allMetadata[walletAddress] || null;
  }

  async getAllVaultMetadata() {
    return (await this.getLocal(this.vaultMetadataKey)) || {};
  }

  async clearVaultMetadata(walletAddress) {
    const allMetadata = await this.getAllVaultMetadata();
    delete allMetadata[walletAddress];
    await this.saveLocal(this.vaultMetadataKey, allMetadata);
  }
}

// Export singleton
const storageService = new StorageService();
