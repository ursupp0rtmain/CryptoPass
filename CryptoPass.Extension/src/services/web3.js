// CryptoPass Extension - Web3 Service

class Web3Service {
  constructor() {
    // IMPORTANT: Message format must match UserApp's Web3Service for key compatibility
    // The actual message is generated in getSignatureMessage() with the wallet address
  }

  // Generate signature message - must match UserApp exactly
  getSignatureMessage(walletAddress) {
    return `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${walletAddress}`;
  }

  // Check if MetaMask is available
  isMetaMaskAvailable() {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // Request wallet connection
  async connect() {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      return accounts[0];
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected connection');
      }
      throw error;
    }
  }

  // Sign message to derive encryption key - compatible with UserApp
  async signMessage(address) {
    if (!this.isMetaMaskAvailable()) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Generate message with wallet address - must match UserApp format
      const message = this.getSignatureMessage(address);

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });

      return signature;
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected signing');
      }
      throw error;
    }
  }

  // Get current connected account
  async getAccount() {
    if (!this.isMetaMaskAvailable()) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting account:', error);
      return null;
    }
  }

  // Listen for account changes
  onAccountChanged(callback) {
    if (this.isMetaMaskAvailable()) {
      window.ethereum.on('accountsChanged', (accounts) => {
        callback(accounts.length > 0 ? accounts[0] : null);
      });
    }
  }

  // Listen for chain changes
  onChainChanged(callback) {
    if (this.isMetaMaskAvailable()) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  // Disconnect listeners
  removeListeners() {
    if (this.isMetaMaskAvailable()) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  // Format address for display
  formatAddress(address) {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Validate Ethereum address
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

// Export singleton
const web3Service = new Web3Service();
