import { Injectable, signal, computed } from '@angular/core';
import { ComposeClient } from '@composedb/client';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { EncryptedPassword } from '../interfaces/password';
import { environment } from '../../environments/environment';

// ComposeDB Runtime Definition - will be generated after model deployment
// Import the actual definition after running: composedb composite:compile
import { definition } from '../__generated__/definition';

export interface CeramicSessionState {
  isAuthenticated: boolean;
  did: string | null;
  walletAddress: string | null;
  expiresAt: number | null;
}

export interface VaultEntryInput {
  entryId: string;
  itemType: string;
  serviceName: string;
  encryptedData: string;
  iv: string;
  category?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VaultEntryNode {
  id: string; // Stream ID
  entryId: string;
  itemType: string;
  serviceName: string;
  encryptedData: string;
  iv: string;
  category: string | null;
  favorite: boolean | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class CeramicService {
  private compose: ComposeClient | null = null;
  private currentDID: DID | null = null;

  // Ceramic Node URL - configured via environment
  private readonly CERAMIC_URL = environment.ceramicNodeUrl;

  // Session state as Angular Signal
  public sessionState = signal<CeramicSessionState>({
    isAuthenticated: false,
    did: null,
    walletAddress: null,
    expiresAt: null,
  });

  // Computed signals
  public isAuthenticated = computed(() => this.sessionState().isAuthenticated);
  public currentDid = computed(() => this.sessionState().did);

  constructor() {
    this.initializeClient();
    // Don't load session from localStorage - always require fresh authentication
    // This avoids CACAO signature verification issues with serialized sessions
  }

  private initializeClient(): void {
    try {
      this.compose = new ComposeClient({
        ceramic: this.CERAMIC_URL,
        definition,
      });
    } catch (error) {
      console.error('Failed to initialize ComposeDB client:', error);
    }
  }


  /**
   * Authenticate user with MetaMask and create DID for Ceramic
   * Uses a single signature for both DID creation and encryption key derivation
   * Returns the signature for encryption key derivation
   */
  async authenticate(ethereumProvider: any): Promise<string> {
    if (!this.compose) {
      throw new Error('ComposeDB client not initialized');
    }

    try {
      // Get account from MetaMask
      const accounts = await ethereumProvider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];

      // Use the original signature message format for DID generation to maintain compatibility
      const didSeedMessage = `CryptoPass DID Seed\n\nThis signature is used to create your decentralized identity for Ceramic.\nWallet: ${walletAddress}`;

      const didSeedSignature = await ethereumProvider.request({
        method: 'personal_sign',
        params: [didSeedMessage, walletAddress],
      });

      // Use the original encryption signature message for backward compatibility
      const encryptionMessage = `Sign this message to authenticate with CryptoPass and derive your encryption key.\n\nNOTE: This signature is used to encrypt/decrypt your passwords. Always use the same wallet address to access your data.\n\nWallet: ${walletAddress}`;

      const encryptionSignature = await ethereumProvider.request({
        method: 'personal_sign',
        params: [encryptionMessage, walletAddress],
      });

      // Derive DID seed from the DID-specific signature to ensure same DID
      const encoder = new TextEncoder();
      const didSignatureBytes = encoder.encode(didSeedSignature);
      const hashBuffer = await crypto.subtle.digest('SHA-256', didSignatureBytes);
      const seed = new Uint8Array(hashBuffer);

      // Create did:key from the seed
      const provider = new Ed25519Provider(seed);
      const did = new DID({ provider, resolver: getResolver() });
      await did.authenticate();

      // Set DID on ComposeDB client
      this.compose.setDID(did);
      this.currentDID = did;

      // Update state
      this.sessionState.set({
        isAuthenticated: true,
        did: did.id,
        walletAddress: walletAddress,
        expiresAt: null, // did:key doesn't expire
      });

      // Return the encryption signature for key derivation
      return encryptionSignature;
    } catch (error: any) {
      // Clear any partial session on error
      this.currentDID = null;

      if (error.code === 4001) {
        throw new Error('User rejected authentication');
      }

      throw error;
    }
  }

  /**
   * Check if DID is authenticated
   */
  isSessionValid(): boolean {
    return this.currentDID !== null && this.currentDID.authenticated;
  }

  /**
   * Get the current DID string
   */
  getCurrentDID(): string | null {
    return this.currentDID?.id || null;
  }

  /**
   * Disconnect and clear DID
   */
  async disconnect(): Promise<void> {
    this.currentDID = null;
    this.sessionState.set({
      isAuthenticated: false,
      did: null,
      walletAddress: null,
      expiresAt: null,
    });
  }

  /**
   * Get all vault entries for the current user
   */
  async getVaultEntries(): Promise<EncryptedPassword[]> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    const query = `
      query GetVaultEntries {
        vaultEntryIndex(first: 1000) {
          edges {
            node {
              id
              entryId
              itemType
              serviceName
              encryptedData
              iv
              category
              favorite
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const result = await this.compose.executeQuery(query);

    if (result.errors) {
      throw new Error('Failed to fetch vault entries');
    }

    const entries = (result.data as any)?.['vaultEntryIndex']?.edges || [];

    return entries.map((edge: { node: VaultEntryNode }) => ({
      id: edge.node.entryId,
      encryptedData: edge.node.encryptedData,
      iv: edge.node.iv,
      type: edge.node.itemType,
      createdAt: new Date(edge.node.createdAt).getTime(),
      updatedAt: new Date(edge.node.updatedAt).getTime(),
      streamId: edge.node.id, // Keep stream ID for updates
      category: edge.node.category,
      favorite: edge.node.favorite,
      serviceName: edge.node.serviceName,
    }));
  }

  /**
   * Add a new vault entry
   */
  async addVaultEntry(entry: VaultEntryInput): Promise<string> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    // Ensure DID is authenticated
    if (!this.currentDID?.authenticated) {
      throw new Error('DID not properly initialized. Please try logging in again.');
    }

    const mutation = `
      mutation CreateVaultEntry($input: CreateVaultEntryInput!) {
        createVaultEntry(input: $input) {
          document {
            id
            entryId
          }
        }
      }
    `;

    const result = await this.compose.executeQuery(mutation, {
      input: {
        content: {
          entryId: entry.entryId,
          itemType: entry.itemType,
          serviceName: entry.serviceName,
          encryptedData: entry.encryptedData,
          iv: entry.iv,
          category: entry.category || null,
          favorite: entry.favorite || false,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        },
      },
    });

    if (result.errors) {
      throw new Error('Failed to create vault entry');
    }

    return (result.data as any)?.['createVaultEntry']?.document?.id;
  }

  /**
   * Update an existing vault entry
   */
  async updateVaultEntry(streamId: string, entry: Partial<VaultEntryInput>): Promise<void> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    const mutation = `
      mutation UpdateVaultEntry($input: UpdateVaultEntryInput!) {
        updateVaultEntry(input: $input) {
          document {
            id
            updatedAt
          }
        }
      }
    `;

    const result = await this.compose.executeQuery(mutation, {
      input: {
        id: streamId,
        content: {
          ...entry,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    if (result.errors) {
      throw new Error('Failed to update vault entry');
    }
  }

  /**
   * Delete a vault entry (set to null/tombstone in Ceramic)
   */
  async deleteVaultEntry(streamId: string): Promise<void> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    // Mark as deleted by setting encrypted data to empty
    // This is safer than complex mutations that might cause 500 errors
    try {
      const mutation = `
        mutation UpdateVaultEntry($input: UpdateVaultEntryInput!) {
          updateVaultEntry(input: $input) {
            document {
              id
              serviceName
            }
          }
        }
      `;

      const result = await this.compose.executeQuery(mutation, {
        input: {
          id: streamId,
          content: {
            encryptedData: 'DELETED_ENTRY',  // Schema requires non-empty string
            iv: 'DELETED_IV',               // Schema requires non-empty string
            serviceName: '[DELETED]',
            updatedAt: new Date().toISOString(),
          },
        },
      });

      if (result.errors) {
        console.error('Ceramic delete errors:', result.errors);
        throw new Error(`Failed to delete vault entry: ${result.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error: any) {
      console.error('Ceramic delete error:', error);
      throw error;
    }
  }

  /**
   * Search vault entries by service name
   */
  async searchVaultEntries(searchTerm: string): Promise<EncryptedPassword[]> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    const query = `
      query SearchVaultEntries($serviceName: String!) {
        vaultEntryIndex(
          first: 100
          filters: {
            where: {
              serviceName: { contains: $serviceName }
            }
          }
        ) {
          edges {
            node {
              id
              entryId
              itemType
              serviceName
              encryptedData
              iv
              category
              favorite
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const result = await this.compose.executeQuery(query, {
      serviceName: searchTerm,
    });

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      throw new Error('Failed to search vault entries');
    }

    const entries = (result.data as any)?.['vaultEntryIndex']?.edges || [];

    return entries.map((edge: { node: VaultEntryNode }) => ({
      id: edge.node.entryId,
      encryptedData: edge.node.encryptedData,
      iv: edge.node.iv,
      type: edge.node.itemType,
      createdAt: new Date(edge.node.createdAt).getTime(),
      updatedAt: new Date(edge.node.updatedAt).getTime(),
      streamId: edge.node.id,
      category: edge.node.category,
      favorite: edge.node.favorite,
      serviceName: edge.node.serviceName,
    }));
  }

  /**
   * Sync all local entries to Ceramic
   * Useful for initial migration from Pinata
   */
  async syncAllEntries(entries: EncryptedPassword[]): Promise<void> {
    if (!this.compose || !this.isSessionValid()) {
      throw new Error('Not authenticated');
    }

    for (const entry of entries) {
      try {
        await this.addVaultEntry({
          entryId: entry.id,
          itemType: entry.type || 'login',
          serviceName: (entry as any).serviceName || 'Imported Entry',
          encryptedData: entry.encryptedData,
          iv: entry.iv,
          category: (entry as any).category,
          favorite: (entry as any).favorite,
          createdAt: new Date(entry.createdAt).toISOString(),
          updatedAt: new Date(entry.updatedAt).toISOString(),
        });
      } catch (error) {
        console.error(`Failed to sync entry ${entry.id}:`, error);
      }
    }
  }
}
