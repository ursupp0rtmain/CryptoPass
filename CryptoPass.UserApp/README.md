# CryptoPass - Dezentraler Passwortmanager

Ein Zero-Knowledge Passwortmanager, der Web3-Authentifizierung und dezentralen Speicher (IPFS) nutzt.

## Technologie-Stack

- **Framework**: Angular 20 mit Signals
- **Web3**: Ethers.js für MetaMask-Integration
- **Verschlüsselung**: WebCrypto API (AES-GCM-256)
- **Speicher**: IPFS via Pinata
- **UI**: PrimeNG Icons

## Setup

### 1. Dependencies installieren

\`\`\`bash
npm install
\`\`\`

### 2. Environment-Konfiguration

Bearbeite `src/environments/environment.development.ts` und füge deine Pinata JWT ein.

### 3. App starten

\`\`\`bash
npm start
\`\`\`

Die App läuft auf http://localhost:4200

## Weitere Informationen

Siehe vollständige Dokumentation in der Datei für Details zu Architektur, Sicherheit und Nutzung.
