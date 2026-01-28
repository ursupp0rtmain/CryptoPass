// CryptoPass Extension - Background Service Worker
// Migrated from Pinata to local storage with Ceramic sync via web app

// Encryption constants - must match UserApp
const ENCRYPTION_SALT = 'CryptoPass-Salt-v1';

// Web App URL - change this to your deployed URL in production
const DEFAULT_WEBAPP_URL = 'http://localhost:4200/extension-login';

// State
let isConnecting = false;

// Get the web app URL (can be configured via storage)
async function getWebAppUrl() {
  const stored = await chrome.storage.local.get(['webAppUrl']);
  return stored.webAppUrl || DEFAULT_WEBAPP_URL;
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.action) {
    case 'connectWallet':
      return await connectWallet();

    case 'loadVault':
      return await loadVault();

    case 'syncVault':
      return await syncVault(message.vault);

    case 'getState':
      return await getState();

    case 'storeCredentials':
      // Received from web app via content script
      await chrome.storage.local.set({
        walletAddress: message.walletAddress,
        masterKey: message.masterKey,
        ceramic_did: message.ceramicDid,
      });
      return { success: true };

    case 'clearCredentials':
      await chrome.storage.local.remove(['walletAddress', 'masterKey', 'ceramic_did', 'vault']);
      return { success: true };

    case 'updateVault':
      await chrome.storage.local.set({ vault: message.vault });
      return { success: true };

    default:
      return { success: false, error: 'Unknown action' };
  }
}

// Wallet connection
async function connectWallet() {
  if (isConnecting) {
    return { success: false, error: 'Already connecting' };
  }

  isConnecting = true;

  try {
    // Check if we have stored credentials
    const stored = await chrome.storage.local.get([
      'walletAddress',
      'masterKey',
      'ceramic_did',
    ]);

    if (stored.walletAddress && stored.masterKey) {
      return {
        success: true,
        address: stored.walletAddress,
        masterKey: stored.masterKey,
        ceramicDid: stored.ceramic_did,
      };
    }

    // Open CryptoPass web app for login (supports all wallets including WalletConnect)
    // The web app will send credentials back via postMessage -> content script
    const webAppUrl = await getWebAppUrl();
    await chrome.tabs.create({ url: webAppUrl });
    return {
      success: false,
      error: 'opening_login',
      message: 'Opening CryptoPass login...'
    };
  } catch (error) {
    console.error('Connection error:', error);
    return { success: false, error: error.message };
  } finally {
    isConnecting = false;
  }
}

async function loadVault() {
  try {
    const stored = await chrome.storage.local.get(['vault', 'walletAddress']);

    if (!stored.walletAddress) {
      return { success: false, error: 'Not connected' };
    }

    // Return locally stored vault
    // Ceramic sync happens through the web app
    return {
      success: true,
      vault: stored.vault || [],
    };
  } catch (error) {
    console.error('Load vault error:', error);
    return { success: false, error: error.message };
  }
}

async function syncVault(vault) {
  try {
    const stored = await chrome.storage.local.get(['walletAddress']);

    if (!stored.walletAddress) {
      return { success: false, error: 'Not connected' };
    }

    // Save locally
    await chrome.storage.local.set({
      vault,
      lastSyncTime: Date.now(),
    });

    // Note: Ceramic sync happens through the web app
    // The extension stores data locally and syncs when the web app is opened

    return { success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
}

async function getState() {
  const stored = await chrome.storage.local.get([
    'walletAddress',
    'vault',
    'ceramic_did',
    'lastSyncTime',
  ]);
  return {
    isConnected: !!stored.walletAddress,
    address: stored.walletAddress,
    ceramicDid: stored.ceramic_did,
    vaultCount: stored.vault?.length || 0,
    lastSyncTime: stored.lastSyncTime,
  };
}

// Context menu for password generation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'cryptopass-generate',
    title: 'Generate Password',
    contexts: ['editable'],
  });

  chrome.contextMenus.create({
    id: 'cryptopass-autofill',
    title: 'Autofill from CryptoPass',
    contexts: ['editable'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === 'cryptopass-generate') {
      const password = generatePassword(16);
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'fillField',
          value: password,
        });
      }
    } else if (info.menuItemId === 'cryptopass-autofill') {
      try {
        await chrome.action.openPopup();
      } catch (e) {
        console.log('Could not open popup programmatically');
      }
    }
  } catch (error) {
    console.error('Context menu action error:', error);
  }
});

// Password generation
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

// Auto-lock timer
let autoLockTimer = null;

function resetAutoLock() {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
  }

  chrome.storage.local.get(['autoLockMinutes'], (result) => {
    const minutes = result.autoLockMinutes || 5;
    if (minutes > 0) {
      autoLockTimer = setTimeout(async () => {
        await chrome.storage.local.remove(['masterKey']);
        console.log('Vault auto-locked');
      }, minutes * 60 * 1000);
    }
  });
}

// Reset timer on any activity
chrome.runtime.onMessage.addListener(() => {
  resetAutoLock();
});

// Initialize
resetAutoLock();
