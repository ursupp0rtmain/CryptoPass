// Auto-generated ComposeDB runtime definition
// DO NOT EDIT MANUALLY

import type { RuntimeCompositeDefinition } from '@composedb/types';

export const definition: RuntimeCompositeDefinition = {
  "models": {
    "VaultEntry": {
      "interface": false,
      "implements": [],
      "id": "kjzl6hvfrbw6c63pep4xrwav7qdtn47pl4xok9ku5zgqrb246diugooamv4sh9l",
      "accountRelation": {
        "type": "list"
      }
    },
    "VaultEntryIndex": {
      "interface": false,
      "implements": [],
      "id": "kjzl6hvfrbw6c8enp35sbvuijmbud3rs0qmld71q4rk6lq95yjxy4e7y5zgpchz",
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
