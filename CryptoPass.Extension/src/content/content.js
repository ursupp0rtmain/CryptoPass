// CryptoPass Extension - Content Script

// Listen for messages from the CryptoPass web app
window.addEventListener('message', (event) => {
  // Only accept messages from the same origin
  if (event.source !== window) return;

  if (event.data?.type === 'CRYPTOPASS_LOGIN') {
    // Forward credentials to background script for storage
    chrome.runtime.sendMessage({
      action: 'storeCredentials',
      walletAddress: event.data.walletAddress,
      masterKey: event.data.masterKey,
      ceramicDid: event.data.ceramicDid
    });
  }

  if (event.data?.type === 'CRYPTOPASS_LOGOUT') {
    chrome.runtime.sendMessage({ action: 'clearCredentials' });
  }

  if (event.data?.type === 'CRYPTOPASS_VAULT_UPDATE') {
    chrome.runtime.sendMessage({
      action: 'updateVault',
      vault: event.data.vault
    });
  }
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'autofill':
      autofillCredentials(message.username, message.password);
      sendResponse({ success: true });
      break;

    case 'fillField':
      fillActiveField(message.value);
      sendResponse({ success: true });
      break;

    case 'getPageInfo':
      sendResponse({
        url: window.location.href,
        domain: window.location.hostname,
        hasLoginForm: detectLoginForm()
      });
      break;

    case 'showLoginOverlay':
      showLoginOverlay();
      sendResponse({ success: true });
      break;
  }
  return true;
});

// ============================================
// Login Overlay - runs on web pages where wallets are available
// ============================================

function showLoginOverlay() {
  // Remove existing overlay if any
  const existing = document.getElementById('cryptopass-login-overlay');
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'cryptopass-login-overlay';
  overlay.innerHTML = `
    <div class="cp-overlay-backdrop"></div>
    <div class="cp-overlay-modal">
      <button class="cp-overlay-close">&times;</button>
      <div class="cp-overlay-logo">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="20" fill="#175ddc"/>
          <path d="M50 20C38.954 20 30 28.954 30 40V45H25C22.239 45 20 47.239 20 50V75C20 77.761 22.239 80 25 80H75C77.761 80 80 77.761 80 75V50C80 47.239 77.761 45 75 45H70V40C70 28.954 61.046 20 50 20ZM50 28C56.627 28 62 33.373 62 40V45H38V40C38 33.373 43.373 28 50 28ZM50 55C53.866 55 57 58.134 57 62C57 65.866 53.866 69 50 69C46.134 69 43 65.866 43 62C43 58.134 46.134 55 50 55Z" fill="white"/>
        </svg>
      </div>
      <h2>CryptoPass</h2>
      <p class="cp-overlay-subtitle">Connect your wallet to continue</p>
      <button class="cp-overlay-btn" id="cp-connect-btn">
        <span class="cp-btn-text">Connect Wallet</span>
        <span class="cp-btn-spinner" style="display:none;"></span>
      </button>
      <div class="cp-overlay-wallets">
        <span>Works with:</span>
        <span title="MetaMask">🦊</span>
        <span title="Uniswap">🦄</span>
        <span title="Coinbase">🔵</span>
        <span title="Rainbow">🌈</span>
      </div>
      <div class="cp-overlay-status" id="cp-status"></div>
      <div class="cp-overlay-error" id="cp-error" style="display:none;"></div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #cryptopass-login-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .cp-overlay-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
    }
    .cp-overlay-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      padding: 40px;
      min-width: 320px;
      text-align: center;
      color: white;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .cp-overlay-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      line-height: 1;
    }
    .cp-overlay-close:hover {
      color: white;
    }
    .cp-overlay-logo svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }
    .cp-overlay-modal h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
    }
    .cp-overlay-subtitle {
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 24px 0;
    }
    .cp-overlay-btn {
      width: 100%;
      padding: 14px 24px;
      background: linear-gradient(135deg, #f6851b 0%, #e2761b 100%);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .cp-overlay-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(246, 133, 27, 0.3);
    }
    .cp-overlay-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .cp-btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: cp-spin 1s linear infinite;
    }
    @keyframes cp-spin {
      to { transform: rotate(360deg); }
    }
    .cp-overlay-wallets {
      margin-top: 20px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .cp-overlay-wallets span:not(:first-child) {
      font-size: 18px;
    }
    .cp-overlay-status {
      margin-top: 16px;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      color: #93c5fd;
      background: rgba(59, 130, 246, 0.15);
      display: none;
    }
    .cp-overlay-status.visible {
      display: block;
    }
    .cp-overlay-error {
      margin-top: 16px;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.15);
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Event handlers
  overlay.querySelector('.cp-overlay-backdrop').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.cp-overlay-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#cp-connect-btn').addEventListener('click', handleConnect);

  async function handleConnect() {
    const btn = overlay.querySelector('#cp-connect-btn');
    const btnText = btn.querySelector('.cp-btn-text');
    const btnSpinner = btn.querySelector('.cp-btn-spinner');
    const status = overlay.querySelector('#cp-status');
    const error = overlay.querySelector('#cp-error');

    btn.disabled = true;
    btnText.textContent = 'Connecting...';
    btnSpinner.style.display = 'block';
    error.style.display = 'none';

    function showStatus(msg) {
      status.textContent = msg;
      status.classList.add('visible');
    }

    function showError(msg) {
      error.textContent = msg;
      error.style.display = 'block';
      status.classList.remove('visible');
    }

    try {
      // Check wallet availability
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask, Uniswap Wallet, or another Web3 wallet.');
      }

      // Get wallet name
      let walletName = 'Wallet';
      if (window.ethereum.isMetaMask) walletName = 'MetaMask';
      else if (window.ethereum.isUniswapWallet) walletName = 'Uniswap Wallet';
      else if (window.ethereum.isCoinbaseWallet) walletName = 'Coinbase Wallet';

      // Request accounts
      showStatus(`Connecting to ${walletName}...`);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];
      showStatus(`Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

      // Sign for encryption key
      showStatus('Please sign to derive your encryption key...');
      const encryptionMsg = `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${walletAddress}`;
      const encryptionSig = await window.ethereum.request({
        method: 'personal_sign',
        params: [encryptionMsg, walletAddress]
      });

      // Sign for DID
      showStatus('Please sign to create your identity...');
      const didMsg = `CryptoPass DID Seed\n\nThis signature is used to create your decentralized identity for Ceramic.\nWallet: ${walletAddress}`;
      const didSig = await window.ethereum.request({
        method: 'personal_sign',
        params: [didMsg, walletAddress]
      });

      // Derive DID seed
      const sigHex = didSig.startsWith('0x') ? didSig.slice(2) : didSig;
      const sigBytes = new Uint8Array(sigHex.length / 2);
      for (let i = 0; i < sigHex.length; i += 2) {
        sigBytes[i / 2] = parseInt(sigHex.substr(i, 2), 16);
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', sigBytes);
      const didSeed = Array.from(new Uint8Array(hashBuffer));

      // Save to extension storage
      showStatus('Saving credentials...');
      await chrome.runtime.sendMessage({
        action: 'storeCredentials',
        walletAddress: walletAddress,
        masterKey: encryptionSig,
        ceramicDid: `did:key:derived:${walletAddress.toLowerCase()}`
      });

      // Also save DID seed for Ceramic
      await chrome.storage.local.set({ didSeed: didSeed });

      showStatus('Success! You can now use CryptoPass.');
      btnText.textContent = 'Connected!';
      btnSpinner.style.display = 'none';

      // Close overlay after delay
      setTimeout(() => overlay.remove(), 1500);

    } catch (err) {
      console.error('CryptoPass login error:', err);
      btnText.textContent = 'Connect Wallet';
      btnSpinner.style.display = 'none';
      btn.disabled = false;

      if (err.code === 4001) {
        showError('Connection rejected. Please try again.');
      } else {
        showError(err.message || 'Connection failed');
      }
    }
  }
}

// Autofill credentials
function autofillCredentials(username, password) {
  const usernameFields = findUsernameFields();
  const passwordFields = findPasswordFields();

  // Fill username
  if (usernameFields.length > 0 && username) {
    fillField(usernameFields[0], username);
  }

  // Fill password
  if (passwordFields.length > 0 && password) {
    fillField(passwordFields[0], password);
  }
}

// Fill a single field
function fillField(field, value) {
  if (!field) return;

  // Focus the field
  field.focus();

  // Set value
  field.value = value;

  // Trigger events for frameworks that listen to them
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));

  // For React controlled inputs
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Fill the currently active/focused field
function fillActiveField(value) {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
    fillField(activeElement, value);
  }
}

// Find username fields
function findUsernameFields() {
  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][id*="user"]',
    'input[type="text"][id*="email"]',
    'input[type="text"][id*="login"]',
    'input[type="text"][autocomplete="username"]',
    'input[type="text"][autocomplete="email"]',
    'input[type="text"][placeholder*="email" i]',
    'input[type="text"][placeholder*="user" i]'
  ];

  const fields = [];
  selectors.forEach(selector => {
    const found = document.querySelectorAll(selector);
    found.forEach(field => {
      if (isVisible(field) && !fields.includes(field)) {
        fields.push(field);
      }
    });
  });

  return fields;
}

// Find password fields
function findPasswordFields() {
  const passwordFields = document.querySelectorAll('input[type="password"]');
  return Array.from(passwordFields).filter(isVisible);
}

// Check if element is visible
function isVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.offsetParent !== null
  );
}

// Detect if page has a login form
function detectLoginForm() {
  const passwordFields = findPasswordFields();
  return passwordFields.length > 0;
}

// Add CryptoPass icon to password fields
function addFieldIcons() {
  const passwordFields = findPasswordFields();

  passwordFields.forEach(field => {
    if (field.dataset.cryptopassIcon) return;
    field.dataset.cryptopassIcon = 'true';

    const wrapper = document.createElement('div');
    wrapper.className = 'cryptopass-field-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline-block; width: 100%;';

    const icon = document.createElement('button');
    icon.className = 'cryptopass-field-icon';
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9.24 2 7 4.24 7 7V10H6C4.9 10 4 10.9 4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12C20 10.9 19.1 10 18 10H17V7C17 4.24 14.76 2 12 2ZM12 4C13.66 4 15 5.34 15 7V10H9V7C9 5.34 10.34 4 12 4ZM12 14C13.1 14 14 14.9 14 16C14 17.1 13.1 18 12 18C10.9 18 10 17.1 10 16C10 14.9 10.9 14 12 14Z" fill="#175ddc"/>
    </svg>`;
    icon.style.cssText = `
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.15s;
      z-index: 9999;
    `;

    icon.addEventListener('mouseenter', () => {
      icon.style.opacity = '1';
    });

    icon.addEventListener('mouseleave', () => {
      icon.style.opacity = '0.7';
    });

    icon.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });

    // Wrap the field
    if (field.parentNode) {
      const parent = field.parentNode;
      const fieldStyle = window.getComputedStyle(field);

      // Only wrap if field has enough space
      if (parseInt(fieldStyle.paddingRight) < 30) {
        field.style.paddingRight = '36px';
      }

      // Insert icon after field (absolute positioned)
      parent.style.position = 'relative';
      parent.insertBefore(icon, field.nextSibling);
    }
  });
}

// Observe DOM changes to detect dynamically added forms
const observer = new MutationObserver((mutations) => {
  let hasNewInputs = false;

  mutations.forEach(mutation => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'INPUT' || node.querySelector?.('input')) {
            hasNewInputs = true;
          }
        }
      });
    }
  });

  if (hasNewInputs) {
    addFieldIcons();
  }
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial scan
document.addEventListener('DOMContentLoaded', addFieldIcons);
if (document.readyState !== 'loading') {
  addFieldIcons();
}
