// Deploy ComposeDB composite to local Ceramic node
// Run with: node scripts/deploy-composite.mjs

import { CeramicClient } from '@ceramicnetwork/http-client';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { createComposite, writeEncodedComposite } from '@composedb/devtools-node';
import { writeFileSync } from 'fs';
const CERAMIC_URL = process.env.CERAMIC_URL || 'http://localhost:7007';

// Fixed seed for deterministic admin DID (for development only!)
// This generates: did:key:z6MkrBdNdwUPnXDVD1DCxedzVVBpaGi8aSmoXFAeKNgtAer8
const ADMIN_SEED = new Uint8Array([
  0x6e, 0x34, 0xb2, 0x77, 0x0a, 0x1e, 0xb0, 0xb1,
  0x5d, 0x4d, 0x25, 0x58, 0x6f, 0x66, 0x13, 0x20,
  0xc8, 0x05, 0x5f, 0x66, 0x22, 0x1b, 0xaa, 0x9f,
  0x8a, 0x05, 0x84, 0xd4, 0x33, 0x52, 0x9e, 0x64
]);

async function main() {
  console.log('🚀 Deploying ComposeDB composite to', CERAMIC_URL);

  // Create a Ceramic client
  const ceramic = new CeramicClient(CERAMIC_URL);

  // Use fixed seed for admin DID
  const seed = ADMIN_SEED;
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  ceramic.did = did;

  console.log('✅ Authenticated with DID:', did.id);

  // Create composite from GraphQL schema
  console.log('📦 Creating composite from schema...');
  const composite = await createComposite(ceramic, './composites/password-entry.graphql');

  console.log('✅ Composite created');
  console.log('   Models:', Object.keys(composite.toRuntime().models));

  // Write encoded composite for future use
  await writeEncodedComposite(composite, './composites/composite.json');
  console.log('✅ Encoded composite saved to ./composites/composite.json');

  // Generate runtime definition
  const runtimeDefinition = composite.toRuntime();

  const definitionContent = `// Auto-generated ComposeDB runtime definition
// DO NOT EDIT MANUALLY
// Generated on ${new Date().toISOString()}

import type { RuntimeCompositeDefinition } from '@composedb/types';

export const definition: RuntimeCompositeDefinition = ${JSON.stringify(runtimeDefinition, null, 2)} as const;
`;

  writeFileSync('./src/app/__generated__/definition.ts', definitionContent);
  console.log('✅ Runtime definition saved to ./src/app/__generated__/definition.ts');

  // Print model IDs for daemon config
  console.log('\n📋 Model IDs for daemon.config.json:');
  for (const [name, model] of Object.entries(runtimeDefinition.models)) {
    console.log(`   ${name}: ${model.id}`);
  }

  console.log('\n✅ Deployment complete!');
  console.log('   Restart the Ceramic container to index the new models.');
}

main().catch(console.error);
