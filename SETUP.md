# CryptoPass - Environment Configuration

## 🔑 Setup API Keys

Before running the application, you need to set up your API keys:

### 1. Copy Environment Template Files

```bash
# In the CryptoPass.UserApp directory
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.development.example.ts src/environments/environment.development.ts
```

### 2. Get Your API Keys

#### Pinata (IPFS Storage)
1. Go to [Pinata Cloud](https://app.pinata.cloud/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key with:
   - Key Name: `CryptoPass`
   - Permissions: `pinFileToIPFS`, `pinJSONToIPFS`
5. Copy the JWT token

#### WalletConnect (Optional, for future features)
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Sign up or log in
3. Create a new project
4. Copy the Project ID

### 3. Update Environment Files

Open `src/environments/environment.ts` and replace:
- `YOUR_PINATA_JWT_HERE` with your Pinata JWT
- `YOUR_WALLETCONNECT_PROJECT_ID_HERE` with your WalletConnect Project ID

Open `src/environments/environment.development.ts` and do the same.

### 4. Security Notes

⚠️ **IMPORTANT**: Never commit your actual `environment.ts` or `environment.development.ts` files to Git!

The `.gitignore` file is already configured to exclude these files. The example files (`.example.ts`) are safe to commit.

## 🚀 Running the App

After setting up your environment files:

```bash
npm install
npm start
```

The app will use `environment.development.ts` by default.

For production build:
```bash
npm run build
```

This will use `environment.ts` (production configuration).
