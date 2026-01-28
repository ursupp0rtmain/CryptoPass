export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export interface SignatureResult {
  signature: string;
  message: string;
}

export interface EncryptionKey {
  key: CryptoKey;
  derivedFrom: string;
}
