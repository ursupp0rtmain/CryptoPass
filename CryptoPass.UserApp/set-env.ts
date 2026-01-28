const fs = require('fs');
const path = require('path');

// Die Ziel-Datei
const targetPath = './src/environments/environment.ts';

// Den Ordner erstellen, falls er nicht existiert
const envDir = './src/environments';
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir);
}

// Der Inhalt der Datei (wird mit den Werten von Spheron befüllt)
const envConfigFile = `
export const environment = {
  production: true,
  enablePayments: true,
  pinataJwt: '${process.env['PINATA_JWT'] || ''}',
  walletConnectProjectId: '${process.env['WALLETCONNECT_PROJECT_ID'] || ''}',
  pinataApiUrl: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  pinataGatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`✅ environment.ts wurde erfolgreich mit den Spheron-Variablen generiert.`);
