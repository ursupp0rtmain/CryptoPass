#!/bin/sh
set -e

echo "Configuring IPFS for Ceramic compatibility..."

# Enable experimental pubsub (required by Ceramic)
ipfs config --json Pubsub.Enabled true 2>/dev/null || true
ipfs config --json Experimental.Libp2pStreamMounting true 2>/dev/null || true
ipfs config --json Experimental.P2pHttpProxy true 2>/dev/null || true

# Remove webrtc-direct from swarm addresses (incompatible with Ceramic)
ipfs config --json Addresses.Swarm '[
  "/ip4/0.0.0.0/tcp/4001",
  "/ip4/0.0.0.0/udp/4001/quic",
  "/ip6/::/tcp/4001",
  "/ip6/::/udp/4001/quic"
]' 2>/dev/null || true

# Enable CORS for API
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]' 2>/dev/null || true
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]' 2>/dev/null || true

echo "✓ IPFS configured for Ceramic compatibility"
exit 0
