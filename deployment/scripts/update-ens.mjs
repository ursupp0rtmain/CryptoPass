#!/usr/bin/env node
// Update ENS/Basename content hash on Base Chain
// Usage: node update-ens.mjs <CID> <DOMAIN>
// Requires: npm install viem dotenv

import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

config();

const CID = process.argv[2];
const DOMAIN = process.argv[3];

if (!CID || !DOMAIN) {
  console.log('Usage: node update-ens.mjs <CID> <DOMAIN>');
  console.log('Example: node update-ens.mjs QmXyz... myname.base.eth');
  process.exit(1);
}

if (!process.env.ENS_UPDATER_PRIVATE_KEY) {
  console.error('ENS_UPDATER_PRIVATE_KEY not set in .env');
  process.exit(1);
}

const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

async function main() {
  console.log('Update ENS Content Hash');
  console.log(`Domain: ${DOMAIN}`);
  console.log(`CID: ${CID}`);
  console.log('');

  try {
    const account = privateKeyToAccount(process.env.ENS_UPDATER_PRIVATE_KEY);
    const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

    console.log(`Wallet: ${account.address}`);

    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`Balance: ${formatEther(balance)} ETH`);

    if (balance < parseEther('0.001')) {
      console.error('Insufficient balance for gas');
      process.exit(1);
    }

    console.log('');
    console.log('Manual update required:');
    console.log('1. Go to: https://www.base.org/names');
    console.log(`2. Find: ${DOMAIN}`);
    console.log('3. Click "Edit"');
    console.log(`4. Set Content Hash to: ipfs://${CID}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
