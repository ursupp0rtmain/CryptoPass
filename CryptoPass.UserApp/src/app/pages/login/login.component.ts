import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Web3Service } from '../../services/web3.service';
import { EncryptionService } from '../../services/encryption.service';
import { CeramicService } from '../../services/ceramic.service';
import { CommonModule } from '@angular/common';

// Window interface is already declared in web3.service.ts

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private web3Service = inject(Web3Service);
  private encryptionService = inject(EncryptionService);
  private ceramicService = inject(CeramicService);
  private router = inject(Router);

  protected isConnecting = signal(false);
  protected errorMessage = signal<string | null>(null);
  protected connectionStep = signal<string>('');
  protected walletState = this.web3Service.walletState;
  protected ceramicState = this.ceramicService.sessionState;

  async connectWallet(): Promise<void> {
    this.isConnecting.set(true);
    this.errorMessage.set(null);

    try {
      if (!this.web3Service.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      // Step 1: Connect to MetaMask
      this.connectionStep.set('Connecting to MetaMask...');
      await this.web3Service.connect();

      // Step 2: Authenticate with Ceramic (creates DID session)
      this.connectionStep.set('Creating decentralized identity...');
      const signature = await this.ceramicService.authenticate(window.ethereum);

      // Step 3: Derive encryption key from signature
      this.connectionStep.set('Deriving encryption key...');
      await this.encryptionService.deriveMasterKey(signature);

      // Step 4: Navigate to vault
      this.connectionStep.set('Loading vault...');
      await this.router.navigate(['/vault']);
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage.set(error.message || 'Failed to connect wallet. Please try again.');
    } finally {
      this.isConnecting.set(false);
      this.connectionStep.set('');
    }
  }

  get hasMetaMask(): boolean {
    return this.web3Service.isMetaMaskInstalled();
  }

  get isAuthenticated(): boolean {
    return this.ceramicService.isAuthenticated();
  }
}
