import { Password } from './password';

export interface ShareRequest {
  id: string;
  fromWalletHash: string;
  toWalletHash: string;
  senderAddress: string;
  encryptedPassword: string;
  password?: Password;
  iv: string;
  sharedKey: string; // Encrypted with recipient's public key
  txHash?: string; // Payment transaction hash
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}

export interface ShareRequestMetadata {
  id: string;
  fromWalletHash: string;
  passwordTitle: string;
  createdAt: number;
  expiresAt: number;
  txHash?: string;
}

export interface Notification {
  id: string;
  type: 'share_request' | 'share_accepted' | 'share_rejected' | 'system';
  title: string;
  message: string;
  data?: ShareRequestMetadata;
  read: boolean;
  createdAt: number;
}

export interface SharePaymentConfig {
  feeWei: string; // Fee in Wei (e.g., "1000000000000000" = 0.001 ETH)
  recipientAddress: string; // Could be a fee collector or the recipient
}
