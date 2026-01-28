import { Injectable } from '@angular/core';
import { VaultItem, EncryptedPassword } from '../interfaces/password';

// Extended interface for Ceramic integration
export interface CeramicEncryptedEntry extends EncryptedPassword {
  serviceName: string; // Unencrypted for search
  category?: string;
  favorite?: boolean;
  streamId?: string; // Ceramic stream ID for updates
}

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private masterKey: CryptoKey | null = null;

  private currentSignature: string | null = null;

  async deriveMasterKey(signature: string): Promise<string> {
    this.currentSignature = signature;
    const encoder = new TextEncoder();
    const signatureData = encoder.encode(signature);

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      signatureData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.masterKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('CryptoPass-Salt-v1'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Return signature for extension sync (extension will derive its own key)
    return signature;
  }

  async encrypt(data: string): Promise<{ encryptedData: string; iv: string }> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized. Please sign in first.');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.masterKey,
      dataBuffer
    );

    return {
      encryptedData: this.bufferToBase64(encryptedBuffer),
      iv: this.bufferToBase64(iv.buffer),
    };
  }

  async decrypt(encryptedData: string, iv: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized. Please sign in first.');
    }

    const encryptedBuffer = this.base64ToBuffer(encryptedData);
    const ivBuffer = this.base64ToBuffer(iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      this.masterKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  async encryptPassword(password: VaultItem): Promise<EncryptedPassword> {
    const passwordJson = JSON.stringify(password);

    const { encryptedData, iv } = await this.encrypt(passwordJson);

    return {
      id: password.id,
      encryptedData,
      iv,
      createdAt: password.createdAt,
      updatedAt: password.updatedAt,
      type: password.type,
    };
  }

  async decryptPassword(encryptedPassword: EncryptedPassword): Promise<VaultItem> {
    try {
      const decryptedJson = await this.decrypt(
        encryptedPassword.encryptedData,
        encryptedPassword.iv
      );

      const passwordData = JSON.parse(decryptedJson);

      return {
        ...passwordData,
        id: encryptedPassword.id,
        createdAt: encryptedPassword.createdAt,
        updatedAt: encryptedPassword.updatedAt,
      };
    } catch (error) {
      console.error('Failed to decrypt password:', error);
      throw new Error('Decryption failed. The password may have been encrypted with a different wallet signature.');
    }
  }

  clearMasterKey(): void {
    this.masterKey = null;
  }

  hasMasterKey(): boolean {
    return this.masterKey !== null;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ============================================
  // Ceramic Integration Methods
  // ============================================

  /**
   * Encrypt a vault item for Ceramic storage
   * Returns the encrypted entry with unencrypted serviceName for search
   */
  async encryptForCeramic(item: VaultItem): Promise<CeramicEncryptedEntry> {
    const { encryptedData, iv } = await this.encrypt(JSON.stringify(item));

    return {
      id: item.id,
      encryptedData,
      iv,
      type: item.type,
      serviceName: item.title, // Keep title unencrypted for search
      category: (item as any).category,
      favorite: item.favorite,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Decrypt a Ceramic entry back to a VaultItem
   */
  async decryptFromCeramic(entry: CeramicEncryptedEntry): Promise<VaultItem> {
    // Skip deleted entries
    if (!entry.encryptedData || 
        entry.serviceName === '[DELETED]' || 
        entry.encryptedData === 'DELETED_ENTRY') {
      throw new Error('Entry has been deleted');
    }

    const decryptedJson = await this.decrypt(entry.encryptedData, entry.iv);
    const itemData = JSON.parse(decryptedJson);

    return {
      ...itemData,
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Batch decrypt multiple Ceramic entries
   * Skips entries that fail to decrypt (wrong key or deleted)
   */
  async decryptBatchFromCeramic(entries: CeramicEncryptedEntry[]): Promise<VaultItem[]> {
    const decrypted: VaultItem[] = [];

    for (const entry of entries) {
      try {
        const item = await this.decryptFromCeramic(entry);
        decrypted.push(item);
      } catch (error) {
        console.warn(`Skipping entry ${entry.id}: ${error}`);
      }
    }

    return decrypted;
  }
}
