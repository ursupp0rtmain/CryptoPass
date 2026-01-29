// @ts-nocheck
// Diese Datei wird mit Node.js ausgeführt: npx ts-node set-env.ts

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================
// CryptoPass Environment Generator
// ============================================
// Generiert die Environment-Dateien für die Angular App
// und prüft ob Ceramic/IPFS Docker Services laufen.

const envDir = './src/environments';

// Konfiguration
const config = {
  // Ceramic Node URL - kann über Umgebungsvariable überschrieben werden
  ceramicNodeUrl: process.env['CERAMIC_NODE_URL'] || 'http://localhost:7007',

  // Für Production kann ein öffentliches Testnet verwendet werden
  ceramicNodeUrlProd: process.env['CERAMIC_NODE_URL_PROD'] || 'http://localhost:7007',

  // Payments Feature Flag
  enablePayments: process.env['ENABLE_PAYMENTS'] === 'true',
};

// Den Ordner erstellen, falls er nicht existiert
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

// Environment Interface (zur Referenz)
const interfaceContent = `export interface Environment {
  production: boolean;
  ceramicNodeUrl: string;
  enablePayments?: boolean;
}
`;

// Development Environment
const devEnvContent = `import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  ceramicNodeUrl: '${config.ceramicNodeUrl}',
  enablePayments: ${config.enablePayments},
};
`;

// Production Environment
const prodEnvContent = `import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  ceramicNodeUrl: '${config.ceramicNodeUrlProd}',
  enablePayments: ${config.enablePayments},
};
`;

// Dateien schreiben
fs.writeFileSync(path.join(envDir, 'environment.interface.ts'), interfaceContent);
fs.writeFileSync(path.join(envDir, 'environment.development.ts'), devEnvContent);
fs.writeFileSync(path.join(envDir, 'environment.ts'), prodEnvContent);

console.log('✅ Environment-Dateien wurden generiert:');
console.log(`   - environment.interface.ts`);
console.log(`   - environment.development.ts (ceramicNodeUrl: ${config.ceramicNodeUrl})`);
console.log(`   - environment.ts (ceramicNodeUrl: ${config.ceramicNodeUrlProd})`);

// ============================================
// Docker/Ceramic Status Check
// ============================================

function checkDockerServices() {
  console.log('\n🔍 Prüfe Container Services (Docker/Podman)...');

  // Prüfe ob Docker oder Podman läuft
  let containerCmd = 'docker';
  let composeCmd = 'docker-compose';

  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    try {
      execSync('podman info', { stdio: 'ignore' });
      containerCmd = 'podman';
      composeCmd = 'podman compose';
    } catch {
      console.log('⚠️  Weder Docker noch Podman ist gestartet!');
      console.log('   Starte Docker Desktop oder Podman und führe dann aus:');
      console.log('   cd ../ceramic-recon && docker-compose up -d');
      return false;
    }
  }

  console.log(`   Verwende: ${containerCmd}`);

  try {
    // Prüfe ob ceramic-recon Container laufen
    const containers = execSync(`${containerCmd} ps --format "{{.Names}}"`, { encoding: 'utf-8' });

    const ceramicRunning = containers.includes('ceramic');
    const ipfsRunning = containers.includes('ipfs');

    if (ceramicRunning && ipfsRunning) {
      console.log('✅ Ceramic und IPFS Container laufen');
      return true;
    } else {
      console.log('⚠️  Ceramic/IPFS Container laufen nicht!');
      if (!ceramicRunning) console.log('   - Ceramic Container fehlt');
      if (!ipfsRunning) console.log('   - IPFS Container fehlt');
      console.log('\n   Starte die Services mit:');
      console.log(`   cd ../ceramic-recon && ${composeCmd} up -d`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Konnte Container Status nicht prüfen');
    return false;
  }
}

// Prüfe Ceramic Verbindung
async function checkCeramicConnection() {
  console.log(`\n🔍 Prüfe Ceramic Verbindung (${config.ceramicNodeUrl})...`);

  try {
    const http = require('http');

    return new Promise((resolve) => {
      let resolved = false;

      const req = http.get(`${config.ceramicNodeUrl}/api/v0/node/healthcheck`, { timeout: 5000 }, (res) => {
        if (resolved) return;
        resolved = true;

        if (res.statusCode === 200) {
          console.log('✅ Ceramic Node erreichbar');
          resolve(true);
        } else {
          console.log(`⚠️  Ceramic Node antwortet mit Status ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', () => {
        if (resolved) return;
        resolved = true;

        console.log('❌ Ceramic Node nicht erreichbar (ERR_CONNECTION_REFUSED)');
        console.log('\n   Lösung: Starte die Container Services:');
        console.log('   cd ../ceramic-recon && podman compose up -d');
        resolve(false);
      });

      req.on('timeout', () => {
        if (resolved) return;
        resolved = true;

        req.destroy();
        console.log('⚠️  Ceramic Node Timeout');
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

// Hauptfunktion
async function main() {
  const dockerOk = checkDockerServices();

  if (dockerOk) {
    await checkCeramicConnection();
  }

  console.log('\n============================================');
  console.log('Umgebungsvariablen (optional):');
  console.log('  CERAMIC_NODE_URL      - Ceramic Node für Development');
  console.log('  CERAMIC_NODE_URL_PROD - Ceramic Node für Production');
  console.log('  ENABLE_PAYMENTS       - Payments aktivieren (true/false)');
  console.log('============================================\n');
}

main();
