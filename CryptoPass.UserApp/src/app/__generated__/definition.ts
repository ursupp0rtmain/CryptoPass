// Auto-generated ComposeDB runtime definition
// DO NOT EDIT MANUALLY
// Generated on 2026-01-29T06:43:35.769Z

import type { RuntimeCompositeDefinition } from '@composedb/types';

export const definition: RuntimeCompositeDefinition = {
  "models": {
    "VaultEntry": {
      "interface": false,
      "implements": [],
      "id": "kjzl6hvfrbw6c9y6ghjqmz057oyi7zy2npym9evuewi98l7e1cx6lhurhjxugsf",
      "accountRelation": {
        "type": "list"
      }
    },
    "VaultEntryIndex": {
      "interface": false,
      "implements": [],
      "id": "kjzl6hvfrbw6c8zc70gkb88u94463dj4ybskw6ke19jb09m3woku4fx10whvq18",
      "accountRelation": {
        "type": "list"
      }
    }
  },
  "objects": {
    "VaultEntry": {
      "iv": {
        "type": "string",
        "required": true,
        "immutable": false
      },
      "entryId": {
        "type": "string",
        "required": true,
        "immutable": false
      },
      "category": {
        "type": "string",
        "required": false,
        "immutable": false
      },
      "favorite": {
        "type": "boolean",
        "required": false,
        "immutable": false
      },
      "itemType": {
        "type": "string",
        "required": true,
        "immutable": false
      },
      "createdAt": {
        "type": "datetime",
        "required": true,
        "immutable": false
      },
      "updatedAt": {
        "type": "datetime",
        "required": true,
        "immutable": false
      },
      "serviceName": {
        "type": "string",
        "required": true,
        "immutable": false
      },
      "encryptedData": {
        "type": "string",
        "required": true,
        "immutable": false
      }
    },
    "VaultEntryIndex": {
      "entry": {
        "type": "streamid",
        "required": true,
        "immutable": false
      },
      "itemType": {
        "type": "string",
        "required": true,
        "immutable": false
      },
      "updatedAt": {
        "type": "datetime",
        "required": true,
        "immutable": false
      },
      "serviceName": {
        "type": "string",
        "required": true,
        "immutable": false
      }
    }
  },
  "enums": {},
  "accountData": {
    "vaultEntryIndexList": {
      "type": "connection",
      "name": "VaultEntryIndex"
    },
    "vaultEntryList": {
      "type": "connection",
      "name": "VaultEntry"
    }
  }
} as const;
