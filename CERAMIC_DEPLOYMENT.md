# CryptoPass - Ceramic Network Deployment Guide

This guide explains how to deploy the CryptoPass ComposeDB models to the Ceramic Network.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. A **Ceramic node** (either local or connected to testnet)

## Installation

Install the ComposeDB CLI and dependencies:

```bash
# Install ComposeDB CLI globally
npm install -g @composedb/cli

# Install project dependencies
cd CryptoPass.UserApp
npm install @composedb/client @composedb/types did-session @didtools/pkh-ethereum dids
```

## Ceramic Node Setup

### Option 1: Use Clay Testnet (Recommended for Development)

No setup required - the app is pre-configured to use `https://ceramic-clay.3boxlabs.com`

### Option 2: Run Local Ceramic Node

```bash
# Install Ceramic CLI
npm install -g @ceramicnetwork/cli

# Start local node
ceramic daemon
```

## Model Deployment Steps

### Step 1: Generate a DID for Deployment

Create an admin DID that will own the models:

```bash
# Generate a new DID seed
composedb did:generate-private-key

# Save the output! Example:
# Private key: 0x1234...
# DID: did:key:z6Mk...
```

Save the private key securely - you'll need it for deployments.

### Step 2: Create Composite from Schema

```bash
# Set your DID private key
export DID_PRIVATE_KEY="your-private-key-here"

# Create the composite from the GraphQL schema
composedb composite:create composites/password-entry.graphql \
  --ceramic-url=https://ceramic-clay.3boxlabs.com \
  --output=composites/password-entry-composite.json
```

### Step 3: Deploy Composite to Ceramic

```bash
# Deploy the composite (creates the models on Ceramic)
composedb composite:deploy composites/password-entry-composite.json \
  --ceramic-url=https://ceramic-clay.3boxlabs.com
```

### Step 4: Generate Runtime Definition

After deployment, generate the TypeScript runtime definition:

```bash
# Generate JSON definition
composedb composite:compile \
  composites/password-entry-composite.json \
  src/app/__generated__/definition.json

# Generate TypeScript definition
composedb composite:compile \
  composites/password-entry-composite.json \
  src/app/__generated__/definition.ts \
  --format=ts
```

### Step 5: Update the Angular App

Replace the placeholder definition in `src/app/__generated__/definition.ts` with the generated one.

## NPM Scripts (Add to package.json)

Add these scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "composedb:create": "composedb composite:create composites/password-entry.graphql --ceramic-url=https://ceramic-clay.3boxlabs.com --output=composites/password-entry-composite.json",
    "composedb:deploy": "composedb composite:deploy composites/password-entry-composite.json --ceramic-url=https://ceramic-clay.3boxlabs.com",
    "composedb:compile": "composedb composite:compile composites/password-entry-composite.json src/app/__generated__/definition.ts --format=ts"
  }
}
```

## Schema Explanation

The ComposeDB schema (`composites/password-entry.graphql`) defines:

### VaultEntry Model
- `entryId`: Unique identifier for the entry
- `itemType`: Type of vault item ('login', 'note', 'address', 'card')
- `serviceName`: Unencrypted service name (for search)
- `encryptedData`: AES-GCM encrypted JSON with all sensitive data
- `iv`: Initialization vector for decryption
- `category`: Optional category for organization
- `favorite`: Favorite flag
- `createdAt`/`updatedAt`: Timestamps

### Security Features
- **accountRelation: LIST** - Each user (DID) has their own list of entries
- **Only the owner can modify** - Ceramic enforces DID-based access control
- **Zero-Knowledge** - Sensitive data is encrypted client-side before storage

## Migration from Pinata

If you have existing data in Pinata/IPFS:

1. Login with your wallet in the web app
2. Your existing passwords will be loaded from Pinata (if metadata exists)
3. Any new changes will be saved to Ceramic
4. Old Pinata data remains accessible but new data goes to Ceramic

To force migration of all data:
```typescript
// In your Angular app
const ceramicService = inject(CeramicService);
const storageService = inject(StorageService);

// Load from old Pinata storage
const oldVault = await loadFromPinata(walletAddress);

// Sync to Ceramic
await ceramicService.syncAllEntries(oldVault.passwords);
```

## Environment Configuration

Update `src/environments/environment.ts`:

```typescript
export const environment = {
  production: true,
  ceramicNodeUrl: 'https://ceramic-clay.3boxlabs.com', // Testnet
  // For production, use: 'https://ceramic.network'
};
```

## Troubleshooting

### "Model not found" Error
- Ensure you've deployed the composite: `npm run composedb:deploy`
- Check that `definition.ts` contains the correct model IDs

### "Not authenticated" Error
- The user needs to sign the Ceramic session message
- Check that MetaMask is connected and the session hasn't expired

### "Decryption failed" Error
- The user is trying to decrypt with a different wallet
- Each wallet generates a unique encryption key

## Production Deployment

For mainnet deployment:

1. Change `ceramicNodeUrl` to `https://ceramic.network`
2. Deploy models to mainnet: `--ceramic-url=https://ceramic.network`
3. Generate new runtime definition
4. Test thoroughly before going live

## Resources

- [ComposeDB Documentation](https://composedb.js.org/)
- [Ceramic Network](https://ceramic.network/)
- [DID Session](https://did.js.org/docs/guides/did-session)
