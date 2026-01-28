// CryptoPass Extension - Login Page
// This page runs in a tab and has access to window.ethereum (MetaMask)

const ENCRYPTION_SALT = 'CryptoPass-Salt-v1';

// Signature messages - must match UserApp exactly
function getEncryptionSignatureMessage(walletAddress) {
  return `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${walletAddress}`;
}

function getDIDSeedMessage(walletAddress) {
  return `CryptoPass DID Seed\n\nThis signature is used to create your decentralized identity for Ceramic.\nWallet: ${walletAddress}`;
}

// UI Elements
const btnConnect = document.getElementById('btn-connect');
const statusDiv = document.getElementById('status');
const noWalletDiv = document.getElementById('no-wallet');
const walletSupportDiv = document.querySelector('.wallet-support');

// Check if any EIP-1193 wallet is available
function isWalletAvailable() {
  return typeof window.ethereum !== 'undefined';
}

// Get wallet name for display
function getWalletName() {
  if (!window.ethereum) return 'Unknown';
  if (window.ethereum.isMetaMask) return 'MetaMask';
  if (window.ethereum.isUniswapWallet) return 'Uniswap Wallet';
  if (window.ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
  if (window.ethereum.isRainbow) return 'Rainbow';
  return 'Wallet';
}

// Show status message
function showStatus(message, type = 'info') {
  statusDiv.style.display = 'block';
  statusDiv.className = `status ${type}`;
  statusDiv.innerHTML = message;
}

// Initialize
if (!isWalletAvailable()) {
  btnConnect.style.display = 'none';
  walletSupportDiv.style.display = 'none';
  noWalletDiv.style.display = 'block';
} else {
  btnConnect.addEventListener('click', connectWallet);
}

// Main connect function
async function connectWallet() {
  btnConnect.disabled = true;
  btnConnect.innerHTML = '<span class="spinner"></span> Connecting...';

  const walletName = getWalletName();

  try {
    // Step 1: Request accounts
    showStatus(`Connecting to ${walletName}...`, 'info');
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const walletAddress = accounts[0];
    showStatus(`Connected via ${walletName}: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, 'info');

    // Step 2: Sign message for encryption key
    showStatus('Please sign the message to derive your encryption key...', 'info');
    const encryptionMessage = getEncryptionSignatureMessage(walletAddress);
    const encryptionSignature = await window.ethereum.request({
      method: 'personal_sign',
      params: [encryptionMessage, walletAddress]
    });

    // Step 3: Sign message for DID seed (for Ceramic compatibility)
    showStatus('Please sign the message to create your identity...', 'info');
    const didMessage = getDIDSeedMessage(walletAddress);
    const didSignature = await window.ethereum.request({
      method: 'personal_sign',
      params: [didMessage, walletAddress]
    });

    // Step 4: Derive DID from signature (same as UserApp)
    const didSeed = await deriveDIDSeed(didSignature);
    const ceramicDid = `did:key:derived:${walletAddress.toLowerCase()}`;

    // Step 5: Store credentials in extension storage
    showStatus('Saving credentials...', 'info');
    await chrome.storage.local.set({
      walletAddress: walletAddress,
      masterKey: encryptionSignature,
      ceramic_did: ceramicDid,
      didSeed: Array.from(didSeed), // Store seed for Ceramic operations
      lastLogin: Date.now()
    });

    showStatus('Login successful! You can close this tab.', 'success');
    btnConnect.innerHTML = 'Connected!';

    // Close tab after short delay
    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('Login error:', error);

    if (error.code === 4001) {
      showStatus('Connection rejected. Please try again.', 'error');
    } else {
      showStatus(`Error: ${error.message}`, 'error');
    }

    btnConnect.disabled = false;
    btnConnect.innerHTML = `
      <svg viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32.958 1L19.333 11.453L21.791 5.26L32.958 1Z" fill="#E2761B"/>
        <path d="M2.042 1L15.55 11.55L13.208 5.26L2.042 1Z" fill="#E4761B"/>
      </svg>
      Connect with MetaMask
    `;
  }
}

// Derive DID seed from signature (matches UserApp ceramic.service.ts)
async function deriveDIDSeed(signature) {
  // Remove 0x prefix if present
  const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;

  // Convert hex to bytes
  const signatureBytes = new Uint8Array(sigHex.length / 2);
  for (let i = 0; i < sigHex.length; i += 2) {
    signatureBytes[i / 2] = parseInt(sigHex.substr(i, 2), 16);
  }

  // Hash to get 32 bytes
  const hashBuffer = await crypto.subtle.digest('SHA-256', signatureBytes);
  return new Uint8Array(hashBuffer);
}
