// @ts-nocheck
// Environment file generator for CryptoPass
// Run: node set-env.ts

const fs = require('fs');
const path = require('path');

const envDir = './src/environments';

const config = {
  ceramicNodeUrl: process.env['CERAMIC_NODE_URL'] || 'http://localhost:7007',
  ceramicNodeUrlProd: process.env['CERAMIC_NODE_URL_PROD'] || process.env['CERAMIC_NODE_URL'] || 'http://localhost:7007',
  enablePayments: process.env['ENABLE_PAYMENTS'] === 'true',
};

if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const interfaceContent = `export interface Environment {
  production: boolean;
  ceramicNodeUrl: string;
  enablePayments?: boolean;
}
`;

const devEnvContent = `import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  ceramicNodeUrl: '${config.ceramicNodeUrl}',
  enablePayments: ${config.enablePayments},
};
`;

const prodEnvContent = `import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  ceramicNodeUrl: '${config.ceramicNodeUrlProd}',
  enablePayments: ${config.enablePayments},
};
`;

fs.writeFileSync(path.join(envDir, 'environment.interface.ts'), interfaceContent);
fs.writeFileSync(path.join(envDir, 'environment.development.ts'), devEnvContent);
fs.writeFileSync(path.join(envDir, 'environment.ts'), prodEnvContent);

console.log('Environment files generated:');
console.log('  ceramicNodeUrl: ' + config.ceramicNodeUrlProd);
console.log('  enablePayments: ' + config.enablePayments);
