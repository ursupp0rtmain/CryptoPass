# CryptoPass - Project Structure & Implementation Guide

## 📁 Complete Project Structure

```
CryptoPass/
├── CryptoPass.UserApp/          # Angular Frontend Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/      # UI Components
│   │   │   │   ├── add-password/
│   │   │   │   │   ├── add-password.component.ts
│   │   │   │   │   ├── add-password.component.html
│   │   │   │   │   └── add-password.component.scss
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── notifications.component.ts
│   │   │   │   │   ├── notifications.component.html
│   │   │   │   │   └── notifications.component.scss
│   │   │   │   ├── share-dialog/
│   │   │   │   │   ├── share-dialog.component.ts
│   │   │   │   │   ├── share-dialog.component.html
│   │   │   │   │   └── share-dialog.component.scss
│   │   │   │   └── receive-dialog/
│   │   │   │       ├── receive-dialog.component.ts
│   │   │   │       ├── receive-dialog.component.html
│   │   │   │       └── receive-dialog.component.scss
│   │   │   │
│   │   │   ├── pages/           # Page Components
│   │   │   │   ├── login/
│   │   │   │   │   ├── login.component.ts
│   │   │   │   │   ├── login.component.html
│   │   │   │   │   └── login.component.scss
│   │   │   │   └── vault/
│   │   │   │       ├── vault.component.ts
│   │   │   │       ├── vault.component.html
│   │   │   │       └── vault.component.scss
│   │   │   │
│   │   │   ├── services/        # Core Services
│   │   │   │   ├── web3.service.ts          # Wallet connection (ethers v6)
│   │   │   │   ├── encryption.service.ts     # AES-256 encryption
│   │   │   │   ├── storage.service.ts        # IPFS via Pinata
│   │   │   │   ├── share.service.ts          # Password sharing
│   │   │   │   └── notification.service.ts   # Notifications
│   │   │   │
│   │   │   ├── interfaces/      # TypeScript Interfaces
│   │   │   │   ├── password.ts
│   │   │   │   ├── vault.ts
│   │   │   │   ├── web3.ts
│   │   │   │   └── share-request.ts
│   │   │   │
│   │   │   ├── app.config.ts    # App configuration
│   │   │   ├── app.routes.ts    # Routing
│   │   │   └── app.ts           # Root component
│   │   │
│   │   ├── environments/        # Environment configs (auto-generated)
│   │   │   ├── environment.example.ts
│   │   │   └── environment.development.example.ts
│   │   │
│   │   ├── index.html           # Main HTML
│   │   ├── main.ts              # Bootstrap
│   │   └── styles.scss          # Global styles
│   │
│   ├── set-env.ts               # Environment generator script
│   ├── package.json
│   ├── tsconfig.json
│   ├── angular.json
│   └── .gitignore
│
├── SETUP.md                     # Setup instructions
└── README.md
```

---

## 🔧 Implementation Details

### 1. Angular Frontend Services

#### **Web3Service** (`src/app/services/web3.service.ts`)

**Purpose:** Wallet connection and message signing with ethers v6

**Key Features:**
- MetaMask connection via `BrowserProvider`
- Wallet state management with Angular Signals
- Message signing for authentication
- Account and chain change listeners

**Core Methods:**
```typescript
async connect(): Promise<void>
async signAuthenticationMessage(): Promise<string>
async signMessage(message: string): Promise<SignatureResult>
```

**Implementation:**
- Uses `ethers` v6 (`BrowserProvider`, `parseEther`, `formatEther`)
- Deterministic authentication message (includes wallet address, no timestamp)
- Returns signature for encryption key derivation

---

#### **EncryptionService** (`src/app/services/encryption.service.ts`)

**Purpose:** AES-256-GCM encryption using Web Crypto API

**Key Features:**
- Derives master key from wallet signature using PBKDF2
- AES-256-GCM encryption/decryption
- Base64 encoding for storage

**Core Methods:**
```typescript
async deriveMasterKey(signature: string): Promise<void>
async encrypt(data: string): Promise<{ encryptedData: string; iv: string }>
async decrypt(encryptedData: string, iv: string): Promise<string>
async encryptPassword(password: Password): Promise<EncryptedPassword>
async decryptPassword(encryptedPassword: EncryptedPassword): Promise<Password>
```

**Implementation:**
```typescript
// Key Derivation
const keyMaterial = await crypto.subtle.importKey('raw', signatureData, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);

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

// Encryption
const iv = crypto.getRandomValues(new Uint8Array(12));
const encryptedBuffer = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  this.masterKey,
  dataBuffer
);
```

---

#### **StorageService** (`src/app/services/storage.service.ts`)

**Purpose:** IPFS storage via Pinata API

**Key Features:**
- Upload encrypted vaults to IPFS
- Retrieve vaults by CID
- Wallet address hashing for privacy
- Local caching

**Core Methods:**
```typescript
async uploadVault(vault: Vault): Promise<string>  // Returns IPFS CID
async getVault(cid: string): Promise<Vault | null>
async getLatestVault(walletAddress: string): Promise<Vault | null>
async hashWalletAddress(address: string): Promise<string>
```

**Implementation:**
```typescript
// Upload to IPFS via Pinata
const formData = new FormData();
const blob = new Blob([JSON.stringify(vault)], { type: 'application/json' });
formData.append('file', blob, `vault-${vault.walletAddress}.json`);

const response = await axios.post(
  environment.pinataApiUrl,
  formData,
  {
    headers: {
      'Authorization': `Bearer ${environment.pinataJwt}`,
      'Content-Type': 'multipart/form-data',
    }
  }
);

return response.data.IpfsHash; // CID
```

---

#### **ShareService** (`src/app/services/share.service.ts`)

**Purpose:** Secure password sharing between wallets

**Key Features:**
- Encrypt passwords for sharing
- Optional micro-payment as spam protection
- Share request management
- Notification integration

**Core Methods:**
```typescript
async sendShareRequest(password: Password, recipientAddress: string): Promise<{ success: boolean; txHash?: string }>
async acceptShareRequest(requestId: string): Promise<Password | null>
```

**Payment Feature:**
```typescript
// Optional ETH payment to prevent spam
if (environment.enablePayments) {
  const tx = await signer.sendTransaction({
    to: recipientAddress,
    value: parseEther('0.0001') // 0.0001 ETH
  });
  await tx.wait();
}
```

---

#### **NotificationService** (`src/app/services/notification.service.ts`)

**Purpose:** In-app notification management

**Key Features:**
- Angular Signals for reactive updates
- LocalStorage persistence
- Share request notifications
- Unread count tracking

---

### 2. UI Components

#### **VaultComponent** (`src/app/pages/vault`)

**Bitwarden-inspired design:**
- Three-column layout (can be extended with sidebar)
- Password list view with search
- Detail view on item selection
- Add/Edit form view
- Quick copy buttons
- Share functionality

**State Management:**
```typescript
protected passwords = signal<Password[]>([]);
protected selectedPassword = signal<Password | null>(null);
protected showAddForm = signal(false);
protected searchTerm = signal('');
```

---

#### **LoginComponent** (`src/app/pages/login`)

**Features:**
- MetaMask connection
- Signature prompt for key derivation
- Error handling
- Loading states

---

### 3. Styling (Bitwarden-inspired)

**Color Scheme:**
```scss
:root {
  --bg-color: #1e1e1e;              // Dark background
  --element-bg-color: #252526;       // Card background
  --border-color: #3c3c3c;          // Borders
  --text-color: #d4d4d4;            // Text
  --hover-bg-color: #3f3f46;        // Hover state
}
```

**Bitwarden Blue:**
- Primary color: `#175ddc`
- Selected item: `#d6e3f7` (light) / `#2f4f7f` (dark)

---

### 4. Environment Configuration

#### **Setup with Spheron Deployment**

**File:** `set-env.ts`
```typescript
const envConfigFile = `
export const environment = {
  production: true,
  enablePayments: true,
  pinataJwt: '${process.env['PINATA_JWT'] || ''}',
  walletConnectProjectId: '${process.env['WALLETCONNECT_PROJECT_ID'] || ''}',
  pinataApiUrl: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  pinataGatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
};
`;
fs.writeFileSync('./src/environments/environment.ts', envConfigFile);
```

**Build command for Spheron:**
```bash
npm run build  # Runs: node set-env.ts && ng build
```

**Required Environment Variables in Spheron:**
- `PINATA_JWT` - Your Pinata API JWT
- `WALLETCONNECT_PROJECT_ID` - WalletConnect Project ID

---

## 📦 Dependencies (package.json)

```json
{
  "dependencies": {
    "@angular/common": "^20.3.0",
    "@angular/compiler": "^20.3.0",
    "@angular/core": "^20.3.0",
    "@angular/forms": "^20.3.0",
    "@angular/platform-browser": "^20.3.0",
    "@angular/router": "^20.3.0",
    "axios": "^1.13.3",
    "ethers": "^6.16.0",
    "primeicons": "^7.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular/build": "^20.3.2",
    "@angular/cli": "^20.3.2",
    "@angular/compiler-cli": "^20.3.0",
    "typescript": "~5.9.2"
  }
}
```

**Key Dependencies:**
- **ethers v6** - Web3 wallet integration
- **axios** - HTTP requests to Pinata
- **primeicons** - Icon library
- **Angular 20+** - Latest Angular with Signals

---

## 🔐 Security Features

1. **Client-Side Encryption:**
   - AES-256-GCM encryption
   - Key derived from wallet signature (PBKDF2, 100k iterations)
   - IV (Initialization Vector) generated per encryption

2. **No Server-Side Secrets:**
   - All decryption happens client-side
   - Server never sees unencrypted data

3. **Privacy:**
   - Wallet addresses hashed before storage
   - No personal information required

4. **Spam Protection:**
   - Optional micro-payment for password sharing
   - Configurable via `enablePayments` flag

---

## 🚀 Deployment

### Development
```bash
npm install
npm start  # Runs on http://localhost:4200
```

### Production Build
```bash
npm run build  # Output in dist/
```

### Spheron Deployment
1. Set environment variables: `PINATA_JWT`, `WALLETCONNECT_PROJECT_ID`
2. Build command: `npm run build`
3. Output directory: `dist/crypto-pass.user-app/browser`

---

## 📝 Usage Flow

1. **Login:**
   - Connect MetaMask
   - Sign authentication message
   - Key derived from signature

2. **Add Password:**
   - Enter credentials
   - Encrypt with derived key
   - Upload to IPFS
   - Store CID locally

3. **Access Passwords:**
   - Load encrypted vault from IPFS
   - Decrypt with derived key
   - Display in UI

4. **Share Password:**
   - Select password to share
   - Enter recipient wallet address
   - Optional payment transaction
   - Recipient gets notification
   - Recipient accepts/rejects

---

## 🎨 Design Philosophy

**Bitwarden-Inspired:**
- Clean, functional interface
- Focus on usability
- Minimal distractions
- Professional appearance

**Web3-Native:**
- Wallet-first authentication
- Decentralized storage
- No traditional login
- User owns their data

---

## 📚 Additional Resources

- **Pinata Docs:** https://docs.pinata.cloud/
- **Ethers.js v6:** https://docs.ethers.org/v6/
- **Angular Signals:** https://angular.dev/guide/signals

---

**Built with ❤️ for Web3**
