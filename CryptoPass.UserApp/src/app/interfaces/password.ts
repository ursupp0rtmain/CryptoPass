export type VaultItemType = 'login' | 'note' | 'address' | 'card';

export interface BaseVaultItem {
  id: string;
  type: VaultItemType;
  title: string;
  notes?: string;
  favorite?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Password extends BaseVaultItem {
  type: 'login';
  username: string;
  password: string;
  url?: string;
  totp?: string; // TOTP secret for 2FA
}

export interface SecureNote extends BaseVaultItem {
  type: 'note';
  content: string;
}

export interface Address extends BaseVaultItem {
  type: 'address';
  firstName?: string;
  lastName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Card extends BaseVaultItem {
  type: 'card';
  cardholderName: string;
  cardNumber: string;
  expirationMonth?: string;
  expirationYear?: string;
  cvv?: string;
}

export type VaultItem = Password | SecureNote | Address | Card;

export interface EncryptedPassword {
  id: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
  type?: string; // Store the type for proper deserialization
}
