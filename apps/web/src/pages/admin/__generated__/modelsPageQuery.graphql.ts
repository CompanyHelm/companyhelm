/**
 * @generated SignedSource<<bfba3ea0964c2418f4efdf0dc5c4f365>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelsPageQuery$variables = Record<PropertyKey, never>;
export type modelsPageQuery$data = {
  readonly PlatformModelProviderCredentialModels: ReadonlyArray<{
    readonly id: string;
    readonly isAvailable: boolean;
    readonly modelId: string;
    readonly name: string;
    readonly platformModelProviderCredentialId: string;
  }>;
  readonly PlatformModelProviderCredentials: ReadonlyArray<{
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
  }>;
  readonly PlatformModels: ReadonlyArray<{
    readonly agentCount: number;
    readonly description: string;
    readonly id: string;
    readonly isAvailable: boolean;
    readonly isDefault: boolean;
    readonly key: string;
    readonly modelId: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly routeCount: number;
    readonly sessionCount: number;
    readonly updatedAt: string;
  }>;
};
export type modelsPageQuery = {
  response: modelsPageQuery$data;
  variables: modelsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isAvailable",
  "storageKey": null
},
v5 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "PlatformModels",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "key",
        "storageKey": null
      },
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningSupported",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevels",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
        "storageKey": null
      },
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "agentCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "routeCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "sessionCount",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModelProviderCredential",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentials",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v3/*: any*/),
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentialModels",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v4/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelProviderCredentialId",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "modelsPageQuery",
    "selections": (v5/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "modelsPageQuery",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "8b894bf7010e94f69aa432f5d79005fd",
    "id": null,
    "metadata": {},
    "name": "modelsPageQuery",
    "operationKind": "query",
    "text": "query modelsPageQuery {\n  PlatformModels {\n    id\n    key\n    modelProvider\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    isDefault\n    isAvailable\n    agentCount\n    routeCount\n    sessionCount\n    updatedAt\n  }\n  PlatformModelProviderCredentials {\n    id\n    name\n    modelProvider\n    status\n  }\n  PlatformModelProviderCredentialModels {\n    id\n    isAvailable\n    modelId\n    name\n    platformModelProviderCredentialId\n  }\n}\n"
  }
};
})();

(node as any).hash = "cf1854fec6c2d5c765c487da7b567b3a";

export default node;
