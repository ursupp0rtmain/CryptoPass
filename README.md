# 🔐 CryptoPass

A decentralized, Web3-native password manager built on Ceramic Network and IPFS. Your passwords are encrypted client-side and stored on a decentralized network — only you hold the keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🔑 Web3 Authentication** — Login with your Ethereum wallet (MetaMask, WalletConnect, etc.)
- **🔒 End-to-End Encryption** — All data is encrypted client-side before storage
- **🌐 Decentralized Storage** — Powered by Ceramic Network and IPFS
- **🔄 Password Sharing** — Securely share passwords with other users
- **📱 Browser Extension** — Auto-fill passwords on any website
- **🔐 TOTP Support** — Two-factor authentication codes
- **🚫 No Central Server** — Your data never touches centralized servers

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Browser        │     │  Angular        │     │  Ceramic        │
│  Extension      │────▶│  Frontend       │────▶│  Network        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  IPFS           │
                                                │  Storage        │
                                                └─────────────────┘
```

## 📦 Components

| Component | Description |
|-----------|-------------|
| `CryptoPass.UserApp` | Angular web application |
| `CryptoPass.Extension` | Browser extension for auto-fill |
| `deployment` | Docker Compose production stack |
| `ceramic-recon` | Local Ceramic development environment |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or another Web3 wallet

### Development

```bash
# Clone the repository
git clone https://github.com/ursupp0rtmain/CryptoPass.git
cd CryptoPass

# Start the Angular app
cd CryptoPass.UserApp
npm install
npm run serve

# Open http://localhost:4200
```

### Local Ceramic Network (Optional)

```bash
cd ceramic-recon
docker compose up -d
```

## 🐳 Production Deployment

See [deployment/SETUP.md](deployment/SETUP.md) and [deployment/UPDATE.md](deployment/UPDATE.md) for detailed instructions.

```bash
# Quick deploy with Docker Compose
cd deployment
docker compose up -d
```

### Service Ports

| Service | Port |
|---------|------|
| Frontend | 8080 |
| NPM Admin | 81 |
| HTTPS | 8443 |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CERAMIC_NODE_URL` | Ceramic node endpoint | `http://localhost:7007` |
| `CERAMIC_NETWORK` | Network (mainnet/testnet) | `mainnet` |

## 🧩 Browser Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `CryptoPass.Extension` folder

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ceramic Network](https://ceramic.network/) — Decentralized data network
- [IPFS](https://ipfs.io/) — Distributed storage
- [ComposeDB](https://composedb.js.org/) — Graph database on Ceramic
- [Angular](https://angular.io/) — Frontend framework

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Always backup your wallet recovery phrases and never share your private keys.

---

**Made with ❤️ for the decentralized future**
