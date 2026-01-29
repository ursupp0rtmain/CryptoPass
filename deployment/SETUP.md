# CryptoPass Production Deployment

Deploy CryptoPass with Nginx Proxy Manager, IPFS, and Ceramic on any Docker host.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Server (Docker)                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Nginx Proxy Manager (Port 80/443)                     │ │
│  │  ├── app.domain.com     → IPFS Gateway (:8080)       │ │
│  │  ├── ceramic.domain.com → Ceramic API (:7007)        │ │
│  │  └── ipfs.domain.com    → IPFS Gateway (:8080)       │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│         ┌────────────────┼────────────────┐                │
│         ▼                ▼                ▼                │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐          │
│  │   IPFS    │───▶│  Ceramic  │───▶│  Ethereum │          │
│  │  (Kubo)   │    │   Node    │    │    RPC    │          │
│  └───────────┘    └───────────┘    └───────────┘          │
│        │                                                   │
│        ▼                                                   │
│  ┌───────────┐                                            │
│  │ Frontend  │                                            │
│  │ (pinned)  │                                            │
│  └───────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Base Chain (ENS)   │
              │  name.base.eth      │
              │  → ipfs://Qm...     │
              └─────────────────────┘
```

## Prerequisites

- Docker & Docker Compose
- Domain with DNS pointing to server
- Free Alchemy account (for Ethereum RPC)

## Quick Start

### 1. Generate Secrets (run locally)

```bash
# Generate Ceramic admin seed
openssl rand -hex 32
```

To derive the DID from seed:

```bash
npm install key-did-provider-ed25519 dids key-did-resolver

node -e "
const { Ed25519Provider } = require('key-did-provider-ed25519');
const { DID } = require('dids');
const { getResolver } = require('key-did-resolver');

(async () => {
  const seed = Uint8Array.from(Buffer.from('YOUR_SEED_HERE', 'hex'));
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: getResolver() });
  await did.authenticate();
  console.log(did.id);
})();
"
```

### 2. Get Ethereum RPC URL

1. Go to [alchemy.com](https://alchemy.com)
2. Create free account
3. Create App → **Ethereum Mainnet**
4. Copy HTTPS URL

### 3. Server Setup

```bash
# Create config directories
mkdir -p ~/cryptopass/ceramic ~/cryptopass/ipfs

# Create IPFS config
cat > ~/cryptopass/ipfs/ipfs-config.sh << 'EOF'
#!/bin/sh
ipfs config --json Pubsub.Enabled true
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json Swarm.ConnMgr.LowWater 50
ipfs config --json Swarm.ConnMgr.HighWater 100
ipfs config Datastore.StorageMax "50GB"
EOF
chmod +x ~/cryptopass/ipfs/ipfs-config.sh

# Create Ceramic config
cat > ~/cryptopass/ceramic/daemon.config.json << 'EOF'
{
  "http-api": {
    "cors-allowed-origins": [".*"],
    "admin-dids": ["did:key:YOUR_DID_HERE"]
  },
  "ipfs": {
    "mode": "remote",
    "host": "http://ipfs:5001"
  },
  "logger": {"log-level": 2},
  "network": {"name": "mainnet"},
  "state-store": {
    "mode": "fs",
    "local-directory": "/root/.ceramic/statestore/"
  },
  "indexing": {
    "db": "sqlite:///root/.ceramic/indexing.sqlite",
    "allow-queries-before-historical-sync": true,
    "models": []
  }
}
EOF
```

### 4. Deploy with Portainer

Create a new Stack with this compose:

```yaml
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    container_name: cryptopass-npm
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt
    networks:
      - cryptopass-network

  ipfs:
    image: ipfs/kubo:v0.27.0
    container_name: cryptopass-ipfs
    restart: unless-stopped
    volumes:
      - ipfs-data:/data/ipfs
      - ipfs-staging:/export
      - ~/cryptopass/ipfs/ipfs-config.sh:/container-init.d/001-config.sh:ro
    environment:
      - IPFS_PROFILE=server,lowpower
    ports:
      - "4001:4001"
      - "4001:4001/udp"
    expose:
      - "5001"
      - "8080"
    command: daemon --enable-pubsub-experiment --migrate=true
    healthcheck:
      test: ["CMD-SHELL", "ipfs id || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - cryptopass-network

  ceramic:
    image: ceramicnetwork/js-ceramic:6
    container_name: cryptopass-ceramic
    restart: unless-stopped
    depends_on:
      ipfs:
        condition: service_healthy
    volumes:
      - ceramic-data:/root/.ceramic
      - ~/cryptopass/ceramic/daemon.config.json:/root/.ceramic/daemon.config.json:ro
    environment:
      - NODE_ENV=production
      - CERAMIC_ENABLE_EXPERIMENTAL_COMPOSE_DB=true
    expose:
      - "7007"
    command: daemon --config /root/.ceramic/daemon.config.json --port 7007 --hostname 0.0.0.0
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:7007/api/v0/node/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 120s
    networks:
      - cryptopass-network

networks:
  cryptopass-network:

volumes:
  npm-data:
  npm-letsencrypt:
  ipfs-data:
  ipfs-staging:
  ceramic-data:
```

### 5. Configure Nginx Proxy Manager

1. Open `http://SERVER_IP:81`
2. Login: `admin@example.com` / `changeme`
3. **Change password immediately**

Add Proxy Hosts:

| Domain | Forward Host | Port | SSL |
|--------|--------------|------|-----|
| ceramic.domain.com | cryptopass-ceramic | 7007 | ✓ |
| ipfs.domain.com | cryptopass-ipfs | 8080 | ✓ |

## Deploy Frontend to IPFS

### 1. Build Frontend

```bash
cd CryptoPass.UserApp
export CERAMIC_NODE_URL="https://ceramic.yourdomain.com"
node set-env.ts
npm run build
```

### 2. Upload to Server

```bash
scp -r dist/crypto-pass.user-app/browser/ user@SERVER:~/frontend-build/
```

### 3. Add to IPFS

```bash
ssh user@SERVER

# Copy to IPFS container
docker cp ~/frontend-build/. cryptopass-ipfs:/export/frontend/

# Add and pin
CID=$(docker exec cryptopass-ipfs ipfs add -r -Q --pin /export/frontend/)
echo "CID: $CID"
echo "Content hash for ENS: ipfs://$CID"
```

### 4. Link to Basename (Base Chain)

1. Go to [base.org/names](https://www.base.org/names)
2. Select your basename
3. Edit → Content Hash → `ipfs://YOUR_CID`
4. Confirm transaction

Your app is now available at `https://yourname.base.eth.limo`

## Verify Deployment

```bash
# Check IPFS
docker exec cryptopass-ipfs ipfs id

# Check Ceramic
curl http://localhost:7007/api/v0/node/healthcheck

# Check IPFS peers
docker exec cryptopass-ipfs ipfs swarm peers | wc -l
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Ceramic won't start | Check IPFS is healthy first |
| No IPFS peers | Add bootstrap: `docker exec cryptopass-ipfs ipfs bootstrap add /dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN` |
| NPM Bad Gateway | Verify containers are in same network |
| ENS not resolving | Wait 10-15 min for DNS propagation |

## Resource Usage

| Service | RAM | Notes |
|---------|-----|-------|
| NPM | ~100MB | Minimal |
| IPFS | 256MB-1GB | Depends on content |
| Ceramic | 512MB-2GB | Depends on usage |

**Recommended:** 4GB RAM minimum (Hetzner CX21 or similar)
