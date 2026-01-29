#!/bin/bash
# Generate secrets for CryptoPass deployment

set -e

echo "CryptoPass Secret Generator"
echo ""

CERAMIC_ADMIN_SEED=$(openssl rand -hex 32)
echo "CERAMIC_ADMIN_SEED=${CERAMIC_ADMIN_SEED}"

if command -v node &> /dev/null; then
    ADMIN_DID=$(node -e "
const { Ed25519Provider } = require('key-did-provider-ed25519');
const { DID } = require('dids');
const { getResolver } = require('key-did-resolver');

(async () => {
    const seed = Uint8Array.from(Buffer.from('${CERAMIC_ADMIN_SEED}', 'hex'));
    const provider = new Ed25519Provider(seed);
    const did = new DID({ provider, resolver: getResolver() });
    await did.authenticate();
    console.log(did.id);
})();
" 2>/dev/null || echo "Install: npm install key-did-provider-ed25519 dids key-did-resolver")
    echo "CERAMIC_ADMIN_DID=${ADMIN_DID}"
fi

echo ""
echo "Copy these values to your .env file"
