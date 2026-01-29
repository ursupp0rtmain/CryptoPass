#!/bin/sh
# IPFS production configuration - runs at container startup

set -e

ipfs config --json Pubsub.Enabled true 2>/dev/null || true
ipfs config --json Experimental.Libp2pStreamMounting true 2>/dev/null || true

ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]' 2>/dev/null || true
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]' 2>/dev/null || true
ipfs config --json Gateway.HTTPHeaders.Access-Control-Allow-Origin '["*"]' 2>/dev/null || true

ipfs config --json Swarm.ConnMgr.LowWater 50 2>/dev/null || true
ipfs config --json Swarm.ConnMgr.HighWater 100 2>/dev/null || true
ipfs config Datastore.StorageMax "${IPFS_STORAGE_MAX:-50GB}" 2>/dev/null || true
ipfs config --json Datastore.GCPeriod '"1h"' 2>/dev/null || true
ipfs config Routing.Type 'dhtserver' 2>/dev/null || true
ipfs config --json Discovery.MDNS.Enabled false 2>/dev/null || true

echo "IPFS configured"
