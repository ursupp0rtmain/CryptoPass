#!/usr/bin/env node
// Generate secrets for CryptoPass deployment
// Run: npm install key-did-provider-ed25519 dids key-did-resolver && node generate-secrets.mjs

import crypto from 'crypto';

console.log('CryptoPass Secret Generator\n');

const ceramicAdminSeed = crypto.randomBytes(32).toString('hex');
console.log('CERAMIC_ADMIN_SEED=' + ceramicAdminSeed);

try {
  const { Ed25519Provider } = await import('key-did-provider-ed25519');
  const { DID } = await import('dids');
  const { getResolver } = await import('key-did-resolver');

  const seed = Uint8Array.from(Buffer.from(ceramicAdminSeed, 'hex'));
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();

  console.log('CERAMIC_ADMIN_DID=' + did.id);
} catch (e) {
  console.log('\nTo generate DID, install: npm install key-did-provider-ed25519 dids key-did-resolver');
}

console.log('\nCopy these values to your .env file');
