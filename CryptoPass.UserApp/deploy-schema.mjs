import { CeramicClient } from '@ceramicnetwork/http-client';
import { ComposeClient } from '@composedb/client';
import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import { getResolver } from 'key-did-resolver';
import { readFileSync, writeFileSync } from 'fs';
import { createComposite, writeEncodedComposite } from '@composedb/devtools-node';
import { fromString } from 'uint8arrays/from-string';

// Fixed seed for consistent admin DID
const ADMIN_SEED = fromString('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'base16');

async function run() {
  const ceramic = new CeramicClient('http://localhost:7007');

  // Create admin DID for deployment
  const provider = new Ed25519Provider(ADMIN_SEED);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  ceramic.did = did;

  console.log('Admin DID:', did.id);
  console.log('Add this DID to daemon.config.json under http-api.admin-dids');
  console.log('Creating composite from schema...');

  // Create composite from GraphQL schema
  const composite = await createComposite(
    ceramic,
    './composites/password-entry.graphql'
  );

  console.log('Composite created with models:');
  console.log(JSON.stringify(composite.modelIDs, null, 2));

  // Save the composite
  await writeEncodedComposite(composite, './composites/password-entry.json');
  console.log('✓ Saved composite to composites/password-entry.json');

  // Generate runtime definition
  const runtimeDefinition = composite.toRuntime();
  
  // Write TypeScript definition file
  const tsContent = `// Auto-generated ComposeDB runtime definition
// DO NOT EDIT MANUALLY

import type { RuntimeCompositeDefinition } from '@composedb/types';

export const definition: RuntimeCompositeDefinition = ${JSON.stringify(runtimeDefinition, null, 2)} as const;
`;

  writeFileSync('./src/app/__generated__/definition.ts', tsContent);
  console.log('✓ Generated runtime definition at src/app/__generated__/definition.ts');

  console.log('\n✅ Schema deployed successfully!');
  console.log('Model IDs:', composite.modelIDs);
  
  process.exit(0);
}

run().catch((err) => {
  console.error('Error deploying schema:', err);
  process.exit(1);
});
