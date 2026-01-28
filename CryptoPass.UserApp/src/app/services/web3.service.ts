import { Injectable, signal } from '@angular/core';
import { BrowserProvider, Eip1193Provider } from 'ethers';
import { WalletState, SignatureResult } from '../interfaces/web3';

interface EthereumProvider extends Eip1193Provider {
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

@Injectable({
  providedIn: 'root',
})
export class Web3Service {
  private provider: BrowserProvider | null = null;
  public walletState = signal<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: unknown) => {
        this.handleAccountsChanged(accounts as string[]);
      });

      window.ethereum.on('chainChanged', (chainId: unknown) => {
        this.handleChainChanged(chainId as string);
      });
    }
  }

  async connect(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to use CryptoPass.');
    }

    try {
      this.provider = new BrowserProvider(window.ethereum);
      const accounts = (await this.provider.send('eth_requestAccounts', [])) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      this.walletState.set({
        address: accounts[0],
        isConnected: true,
        chainId: chainId,
      });
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.walletState.set({
      address: null,
      isConnected: false,
      chainId: null,
    });
  }

  async signMessage(message: string): Promise<SignatureResult> {
    if (!this.provider || !this.walletState().isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      const signer = await this.provider.getSigner();
      const signature = await signer.signMessage(message);

      return {
        signature,
        message,
      };
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  async signAuthenticationMessage(): Promise<string> {
    const message = `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${this.walletState().address}`;
    const result = await this.signMessage(message);
    return result.signature;
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this.walletState.update((state) => ({
        ...state,
        address: accounts[0],
      }));
    }
  }

  private handleChainChanged(chainId: string): void {
    const numericChainId = parseInt(chainId, 16);
    this.walletState.update((state) => ({
      ...state,
      chainId: numericChainId,
    }));
  }

  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }
}
