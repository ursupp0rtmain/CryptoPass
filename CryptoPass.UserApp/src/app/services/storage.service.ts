import { Injectable, inject } from '@angular/core';
import { CeramicService, VaultEntryInput } from './ceramic.service';
import { CeramicEncryptedEntry } from './encryption.service';
import { Vault } from '../interfaces/vault';
import { EncryptedPassword } from '../interfaces/password';

/**
 * StorageService - Now using Ceramic Network with ComposeDB
 *
 * This service has been migrated from Pinata (IPFS files) to Ceramic Network.
 * Data is stored as structured streams directly linked to the user's DID.
 *
 * Key changes:
 * - No more Pinata JWT or API calls
 * - Data stored as individual Ceramic documents (not a single file)
 * - Each vault entry is its own stream
 * - User identity is the DID derived from wallet
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private ceramicService = inject(CeramicService);

  // Local cache for stream IDs (entryId -> streamId mapping)
  private streamIdCache = new Map<string, string>();

  /**
   * Get the latest vault from Ceramic
   * Fetches all entries and constructs a Vault object
   * Ceramic is the ONLY storage - no localStorage fallback
   */
  async getLatestVault(walletAddress: string): Promise<Vault | null> {
    if (!this.ceramicService.isSessionValid()) {
      return null;
    }

    try {
      const entries = await this.ceramicService.getVaultEntries();

      // Cache stream IDs for later updates
      for (const entry of entries) {
        if ((entry as any).streamId) {
          this.streamIdCache.set(entry.id, (entry as any).streamId);
        }
      }

      // Filter out deleted entries
      const validEntries = entries.filter(
        (e) => e.encryptedData && (e as any).serviceName !== '[DELETED]'
      );

      const ceramicVault: Vault = {
        version: '2.0.0',
        walletAddress,
        passwords: validEntries,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return ceramicVault;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload/sync vault to Ceramic
   * Creates or updates individual entries
   * Ceramic is the ONLY storage - no localStorage fallback
   */
  async uploadVault(vault: Vault): Promise<string> {
    if (!this.ceramicService.isSessionValid()) {
      throw new Error('Ceramic session not valid - please authenticate first');
    }

    // Get existing entries to determine what to update vs create
    const existingEntries = await this.ceramicService.getVaultEntries();
    const existingIds = new Set(existingEntries.map((e) => e.id));

    // Update stream ID cache
    for (const entry of existingEntries) {
      if ((entry as any).streamId) {
        this.streamIdCache.set(entry.id, (entry as any).streamId);
      }
    }

    // Process each password in the vault
    for (const password of vault.passwords) {
      const entry = this.toVaultEntryInput(password);

      if (existingIds.has(password.id)) {
        // Update existing entry
        const streamId = this.streamIdCache.get(password.id);
        if (streamId) {
          await this.ceramicService.updateVaultEntry(streamId, entry);
        }
      } else {
        // Create new entry
        const newStreamId = await this.ceramicService.addVaultEntry(entry);
        this.streamIdCache.set(password.id, newStreamId);
      }
    }

    // Handle deletions (entries in Ceramic but not in vault)
    const currentIds = new Set(vault.passwords.map((p) => p.id));
    for (const existingEntry of existingEntries) {
      if (!currentIds.has(existingEntry.id)) {
        const streamId = this.streamIdCache.get(existingEntry.id);
        if (streamId) {
          await this.ceramicService.deleteVaultEntry(streamId);
          this.streamIdCache.delete(existingEntry.id);
        }
      }
    }

    return 'synced';
  }

  /**
   * Add a single entry to Ceramic
   */
  async addEntry(entry: CeramicEncryptedEntry): Promise<string> {
    if (!this.ceramicService.isSessionValid()) {
      throw new Error('Ceramic session not valid');
    }

    const input = this.toVaultEntryInput(entry);
    const streamId = await this.ceramicService.addVaultEntry(input);
    this.streamIdCache.set(entry.id, streamId);
    return streamId;
  }

  /**
   * Update a single entry in Ceramic
   */
  async updateEntry(entry: CeramicEncryptedEntry): Promise<void> {
    if (!this.ceramicService.isSessionValid()) {
      throw new Error('Ceramic session not valid');
    }

    const streamId = this.streamIdCache.get(entry.id);
    if (!streamId) {
      // If no stream ID cached, create new entry
      await this.addEntry(entry);
      return;
    }

    const input = this.toVaultEntryInput(entry);
    await this.ceramicService.updateVaultEntry(streamId, input);
  }

  /**
   * Delete a single entry from Ceramic
   */
  async deleteEntry(entryId: string): Promise<void> {
    if (!this.ceramicService.isSessionValid()) {
      throw new Error('Ceramic session not valid');
    }

    const streamId = this.streamIdCache.get(entryId);
    if (streamId) {
      await this.ceramicService.deleteVaultEntry(streamId);
      this.streamIdCache.delete(entryId);
    }
  }

  /**
   * Convert EncryptedPassword to VaultEntryInput for Ceramic
   */
  private toVaultEntryInput(entry: EncryptedPassword): VaultEntryInput {
    const ceramicEntry = entry as CeramicEncryptedEntry;

    return {
      entryId: entry.id,
      itemType: entry.type || 'login',
      serviceName: ceramicEntry.serviceName || 'Unknown',
      encryptedData: entry.encryptedData,
      iv: entry.iv,
      category: ceramicEntry.category,
      favorite: ceramicEntry.favorite,
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    };
  }

  /**
   * Clear stream ID cache
   */
  clearCache(): void {
    this.streamIdCache.clear();
  }

  /**
   * Hash wallet address for privacy (used by share service)
   */
  async hashWalletAddress(address: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(address.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
