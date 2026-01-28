import { EncryptedPassword } from './password';

export interface Vault {
  version: string;
  walletAddress: string;
  passwords: EncryptedPassword[];
  createdAt: number;
  updatedAt: number;
}

export interface VaultMetadata {
  ipfsHash: string;
  walletAddress: string;
  lastUpdated: number;
}
