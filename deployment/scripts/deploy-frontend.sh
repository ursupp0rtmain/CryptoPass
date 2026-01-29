#!/bin/bash
# Deploy CryptoPass frontend to IPFS
# Usage: ./deploy-frontend.sh [SERVER_IP]

set -e

SERVER_IP="${1:-localhost}"
IPFS_API="http://${SERVER_IP}:5001"
BUILD_DIR="../CryptoPass.UserApp/dist/crypto-pass.user-app/browser"
FRONTEND_DIR="../CryptoPass.UserApp"

echo "CryptoPass Frontend Deployment"
echo ""

# Build
echo "[1/4] Building frontend..."
cd "$FRONTEND_DIR"
export CERAMIC_NODE_URL="https://ceramic.yourdomain.com"
node set-env.ts
npm run build
cd -

# Check IPFS
echo "[2/4] Checking IPFS..."
if ! curl -s --max-time 5 "${IPFS_API}/api/v0/id" > /dev/null; then
    echo "Cannot connect to IPFS at ${IPFS_API}"
    echo "Try: ssh -L 5001:localhost:5001 user@${SERVER_IP}"
    exit 1
fi

# Upload
echo "[3/4] Uploading to IPFS..."
CID=$(curl -s -X POST "${IPFS_API}/api/v0/add?recursive=true&wrap-with-directory=true&pin=true" \
    -F "file=@${BUILD_DIR}" \
    | tail -1 | jq -r '.Hash')

if [ -z "$CID" ] || [ "$CID" == "null" ]; then
    echo "Upload failed"
    exit 1
fi

# Verify
echo "[4/4] Verifying..."
curl -s -X POST "${IPFS_API}/api/v0/pin/add?arg=${CID}" > /dev/null

echo ""
echo "Deployment complete!"
echo ""
echo "CID: ${CID}"
echo ""
echo "Access:"
echo "  Local:  http://localhost:8080/ipfs/${CID}"
echo "  Public: https://ipfs.io/ipfs/${CID}"
echo ""
echo "For ENS, set content hash to: ipfs://${CID}"

echo "${CID}" > .last-deployment-cid
