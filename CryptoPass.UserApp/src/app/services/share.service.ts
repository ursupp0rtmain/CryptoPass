import { Injectable, inject } from '@angular/core';
import { BrowserProvider, parseEther, formatEther } from 'ethers';
import { Password } from '../interfaces/password';
import { ShareRequest, ShareRequestMetadata } from '../interfaces/share-request';
import { EncryptionService } from './encryption.service';
import { StorageService } from './storage.service';
import { NotificationService } from './notification.service';
import { Web3Service } from './web3.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  private encryptionService = inject(EncryptionService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);
  private web3Service = inject(Web3Service);

  // Minimum fee to prevent spam (0.0001 ETH ~ $0.20-0.40)
  readonly SHARE_FEE_ETH = '0.0001';

  /**
   * Send a password share request to another wallet.
   * Requires a small payment to prevent spam.
   */
  async sendShareRequest(
    password: Password,
    recipientWalletAddress: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const senderAddress = this.web3Service.walletState().address;
      if (!senderAddress) {
        throw new Error('Wallet not connected');
      }

      // 1. Hash both wallet addresses for privacy
      const senderHash = await this.storageService.hashWalletAddress(senderAddress);
      const recipientHash = await this.storageService.hashWalletAddress(recipientWalletAddress);

      // 2. Encrypt the password data for sharing
      const passwordJson = JSON.stringify({
        title: password.title,
        username: password.username,
        password: password.password,
        url: password.url,
        notes: password.notes,
      });

      const { encryptedData, iv } = await this.encryptionService.encrypt(passwordJson);

      // 3. Send micro-payment as spam protection (skip in development if disabled)
      let txHash = 'dev-mode-no-payment';
      if (environment.enablePayments === true) {
        txHash = await this.sendPayment(recipientWalletAddress, this.SHARE_FEE_ETH);
      } else {
        console.log('⚠️ Development mode: Payment skipped');
      }

      // 4. Create share request
      const shareRequest: ShareRequest = {
        id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromWalletHash: senderHash,
        toWalletHash: recipientHash,
        senderAddress: senderAddress,
        encryptedPassword: encryptedData,
        iv: iv,
        sharedKey: '', // In a full implementation, this would be encrypted with recipient's public key
        txHash: txHash,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // 5. Save share request (in production, this would go to IPFS or a messaging layer)
      await this.notificationService.saveShareRequest(shareRequest);

      // 6. Create notification for sender
      this.notificationService.addNotification({
        type: 'system',
        title: 'Password Shared',
        message: `Password "${password.title}" sent to ${recipientWalletAddress.slice(0, 6)}...${recipientWalletAddress.slice(-4)}`,
        data: {
          id: shareRequest.id,
          fromWalletHash: senderHash,
          passwordTitle: password.title,
          createdAt: shareRequest.createdAt,
          expiresAt: shareRequest.expiresAt,
          txHash: txHash,
        },
      });

      // 7. Create notification for recipient (if same user for testing)
      const recipientIsSameUser = senderAddress.toLowerCase() === recipientWalletAddress.toLowerCase();
      if (recipientIsSameUser || environment.enablePayments !== true) {
        // In local testing, create the receive notification immediately
        this.notificationService.addNotification({
          type: 'share_request',
          title: 'New Password Shared',
          message: `${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)} shared "${password.title}" with you`,
          data: {
            id: shareRequest.id,
            fromWalletHash: senderHash,
            passwordTitle: password.title,
            createdAt: shareRequest.createdAt,
            expiresAt: shareRequest.expiresAt,
            txHash: txHash,
          },
        });
      }

      return { success: true, txHash };
    } catch (error: any) {
      console.error('Error sending share request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a small payment as spam protection.
   */
  private async sendPayment(recipientAddress: string, amountEth: string): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: parseEther(amountEth),
    });

    await tx.wait();
    return tx.hash;
  }

  /**
   * Accept an incoming share request and decrypt the password.
   */
  async acceptShareRequest(requestId: string): Promise<Password | null> {
    try {
      const request = this.notificationService.getShareRequest(requestId);
      if (!request) {
        throw new Error('Share request not found');
      }

      // Decrypt the password
      const decryptedJson = await this.encryptionService.decrypt(
        request.encryptedPassword,
        request.iv
      );

      const passwordData = JSON.parse(decryptedJson);

      // Update request status
      this.notificationService.updateShareRequestStatus(requestId, 'accepted');

      // Create notification
      this.notificationService.addNotification({
        type: 'share_accepted',
        title: 'Password Received',
        message: `You accepted the password "${passwordData.title}"`,
      });

      return {
        type: 'login',
        id: `pwd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: passwordData.title,
        username: passwordData.username,
        password: passwordData.password,
        url: passwordData.url,
        notes: passwordData.notes,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error('Error accepting share request:', error);
      return null;
    }
  }

  /**
   * Reject an incoming share request.
   */
  rejectShareRequest(requestId: string): void {
    this.notificationService.updateShareRequestStatus(requestId, 'rejected');
    this.notificationService.addNotification({
      type: 'share_rejected',
      title: 'Password Rejected',
      message: 'You rejected an incoming password share',
    });
  }

  /**
   * Get the current share fee in ETH.
   */
  getShareFee(): string {
    return this.SHARE_FEE_ETH;
  }

  /**
   * Validate a wallet address format.
   */
  isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
