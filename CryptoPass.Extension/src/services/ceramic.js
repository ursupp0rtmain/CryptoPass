// CryptoPass Extension - Ceramic Service
// Simplified Ceramic integration for browser extension

class CeramicService {
  constructor() {
    // Ceramic testnet node
    this.ceramicUrl = 'https://ceramic-clay.3boxlabs.com';
    this.session = null;
    this.did = null;
  }

  /**
   * Check if we have a valid Ceramic session stored
   */
  async hasValidSession() {
    try {
      const stored = await chrome.storage.local.get(['ceramic_session', 'ceramic_did']);
      if (!stored.ceramic_session || !stored.ceramic_did) {
        return false;
      }

      // Check expiration
      const sessionData = JSON.parse(stored.ceramic_session);
      if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
        await this.clearSession();
        return false;
      }

      this.did = stored.ceramic_did;
      return true;
    } catch (error) {
      console.error('Error checking Ceramic session:', error);
      return false;
    }
  }

  /**
   * Get the DID from stored session
   */
  async getDid() {
    const stored = await chrome.storage.local.get(['ceramic_did']);
    return stored.ceramic_did || null;
  }

  /**
   * Store Ceramic session (called after web app authentication)
   */
  async storeSession(sessionData, did) {
    await chrome.storage.local.set({
      ceramic_session: JSON.stringify(sessionData),
      ceramic_did: did,
    });
    this.did = did;
  }

  /**
   * Clear Ceramic session
   */
  async clearSession() {
    await chrome.storage.local.remove(['ceramic_session', 'ceramic_did']);
    this.session = null;
    this.did = null;
  }

  /**
   * Query vault entries from Ceramic
   * Note: In extension context, we use the stored session to make direct API calls
   */
  async getVaultEntries() {
    if (!await this.hasValidSession()) {
      throw new Error('No valid Ceramic session');
    }

    // For extension, we sync via the stored vault
    // The web app handles the actual Ceramic queries
    const stored = await chrome.storage.local.get(['vault']);
    return stored.vault || [];
  }

  /**
   * Sync vault entries to Ceramic via background script
   * The extension primarily reads from local cache and syncs when online
   */
  async syncVaultEntry(entry) {
    // Store locally - actual Ceramic sync happens via web app
    const stored = await chrome.storage.local.get(['vault']);
    const vault = stored.vault || [];

    const existingIndex = vault.findIndex((e) => e.id === entry.id);
    if (existingIndex >= 0) {
      vault[existingIndex] = entry;
    } else {
      vault.push(entry);
    }

    await chrome.storage.local.set({ vault });
    return true;
  }

  /**
   * Delete vault entry
   */
  async deleteVaultEntry(entryId) {
    const stored = await chrome.storage.local.get(['vault']);
    const vault = stored.vault || [];
    const filtered = vault.filter((e) => e.id !== entryId);
    await chrome.storage.local.set({ vault: filtered });
    return true;
  }

  /**
   * Generate a message for authentication
   * Must match the web app's message format for key compatibility
   */
  getAuthMessage(walletAddress) {
    return `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${walletAddress}`;
  }
}

// Export singleton
const ceramicService = new CeramicService();
