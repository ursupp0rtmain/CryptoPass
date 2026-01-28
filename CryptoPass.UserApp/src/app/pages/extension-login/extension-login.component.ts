import { Component, inject, signal } from '@angular/core';
import { Web3Service } from '../../services/web3.service';
import { EncryptionService, CeramicEncryptedEntry } from '../../services/encryption.service';
import { CeramicService } from '../../services/ceramic.service';
import { StorageService } from '../../services/storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-extension-login',
  imports: [CommonModule],
  templateUrl: './extension-login.component.html',
  styleUrl: './extension-login.component.scss',
})
export class ExtensionLoginComponent {
  private web3Service = inject(Web3Service);
  private encryptionService = inject(EncryptionService);
  private ceramicService = inject(CeramicService);
  private storageService = inject(StorageService);

  protected isConnecting = signal(false);
  protected isLoggedIn = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected connectionStep = signal<string>('');
  protected walletState = this.web3Service.walletState;

  async connectWallet(): Promise<void> {
    this.isConnecting.set(true);
    this.errorMessage.set(null);

    try {
      if (!this.web3Service.isMetaMaskInstalled()) {
        throw new Error('No wallet detected. Please install MetaMask, Uniswap Wallet, or another Web3 wallet.');
      }

      // Step 1: Connect to wallet
      this.connectionStep.set('Connecting to wallet...');
      await this.web3Service.connect();

      // Step 2: Authenticate with Ceramic (creates DID session)
      this.connectionStep.set('Creating decentralized identity...');
      const signature = await this.ceramicService.authenticate(window.ethereum);

      // Step 3: Derive encryption key from signature
      this.connectionStep.set('Deriving encryption key...');
      const masterKey = await this.encryptionService.deriveMasterKey(signature);

      // Step 4: Notify browser extension with credentials
      this.connectionStep.set('Syncing with extension...');
      this.notifyExtension(masterKey);

      // Step 5: Load vault from Ceramic and sync to extension
      await this.syncVaultToExtension();

      // Step 6: Show success
      this.isLoggedIn.set(true);
      this.connectionStep.set('');

    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      this.isConnecting.set(false);
      if (!this.isLoggedIn()) {
        this.connectionStep.set('');
      }
    }
  }

  private notifyExtension(masterKey: string): void {
    const walletAddress = this.walletState().address;
    const ceramicDid = this.ceramicService.getCurrentDID();

    window.postMessage({
      type: 'CRYPTOPASS_LOGIN',
      walletAddress,
      masterKey,
      ceramicDid
    }, '*');
  }

  private async syncVaultToExtension(): Promise<void> {
    try {
      const walletAddress = this.walletState().address;
      if (!walletAddress) return;

      // Load encrypted vault from Ceramic
      const vault = await this.storageService.getLatestVault(walletAddress);
      if (!vault || !vault.passwords || vault.passwords.length === 0) {
        // Send empty vault to extension
        window.postMessage({
          type: 'CRYPTOPASS_VAULT_UPDATE',
          vault: []
        }, '*');
        return;
      }

      // Decrypt all entries
      const decryptedItems = await this.encryptionService.decryptBatchFromCeramic(
        vault.passwords as CeramicEncryptedEntry[]
      );

      // Send decrypted vault to extension
      window.postMessage({
        type: 'CRYPTOPASS_VAULT_UPDATE',
        vault: decryptedItems
      }, '*');
    } catch (error) {
      console.error('Failed to sync vault to extension:', error);
      // Don't throw - login can still succeed even if vault sync fails
    }
  }

  closeTab(): void {
    window.close();
  }
}
