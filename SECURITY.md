# Security Policy

## Reporting a Vulnerability

The CryptoPass team takes security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT open public issues for security vulnerabilities.**

Instead, please send a detailed report to the maintainers via:
- GitHub Security Advisories (preferred)
- Direct message to maintainers

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Resolution timeline**: Depends on severity

## Security Best Practices for Users

### Wallet Security

- ✅ Never share your private keys or recovery phrases
- ✅ Use a hardware wallet for large amounts
- ✅ Verify transaction details before signing
- ✅ Keep your wallet software updated

### Browser Extension

- ✅ Only install from official sources
- ✅ Review permissions before installing
- ✅ Keep the extension updated

### General

- ✅ Use strong, unique master passwords
- ✅ Enable 2FA where possible
- ✅ Regularly review your stored passwords
- ✅ Be cautious of phishing attempts

## Encryption Details

CryptoPass uses industry-standard encryption:

- **Key Derivation**: Wallet signature-based
- **Encryption**: AES-256-GCM
- **Storage**: Encrypted data on Ceramic/IPFS
- **Transport**: HTTPS/TLS 1.3

All encryption happens client-side — your unencrypted data never leaves your device.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | ✅ Yes             |
| < 1.0   | ❌ No              |

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who help improve CryptoPass security.
