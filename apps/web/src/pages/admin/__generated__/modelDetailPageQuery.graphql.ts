/**
 * @generated SignedSource<<477dc4a379c4f0cbdb3b25bf2a4e61f6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelDetailPageQuery$variables = {
  platformModelId: string;
};
export type modelDetailPageQuery$data = {
  readonly PlatformModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isAvailable: boolean;
    readonly isDefault: boolean;
    readonly modelId: string;
    readonly name: string;
    readonly platformModelProviderCredentialId: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly updatedAt: string;
  }>;
  readonly PlatformModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly status: string;
  }>;
  readonly PlatformModelRoutes: ReadonlyArray<{
    readonly id: string;
    readonly platformModelProviderCredentialModel: {
      readonly id: string;
      readonly isAvailable: boolean;
      readonly modelId: string;
      readonly name: string;
      readonly platformModelProviderCredential: {
        readonly id: string;
        readonly modelProvider: string;
        readonly name: string;
        readonly status: string;
      } | null | undefined;
    };
    readonly platformModelProviderCredentialModelId: string;
  }>;
  readonly PlatformModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isAvailable: boolean;
    readonly isDefault: boolean;
    readonly modelId: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly routeCount: number;
  }>;
};
export type modelDetailPageQuery = {
  response: modelDetailPageQuery$data;
  variables: modelDetailPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "platformModelId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProvider",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelId",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningSupported",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "reasoningLevels",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isDefault",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isAvailable",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "status",
  "storageKey": null
},
v11 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModel",
    "kind": "LinkedField",
    "name": "PlatformModels",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/),
      (v6/*: any*/),
      (v7/*: any*/),
      (v8/*: any*/),
      (v9/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "routeCount",
        "storageKey": null
      }
    ],
    "storageKey": null
  },
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "platformModelId",
        "variableName": "platformModelId"
      }
    ],
    "concreteType": "PlatformModelRoute",
    "kind": "LinkedField",
    "name": "PlatformModelRoutes",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelProviderCredentialModelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PlatformModelProviderCredentialModel",
        "kind": "LinkedField",
        "name": "platformModelProviderCredentialModel",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          (v9/*: any*/),
          (v3/*: any*/),
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "PlatformModelProviderCredentialSummary",
            "kind": "LinkedField",
            "name": "platformModelProviderCredential",
            "plural": false,
            "selections": [
              (v1/*: any*/),
              (v4/*: any*/),
              (v2/*: any*/),
              (v10/*: any*/)
            ],
            "storageKey": null
          }
        ],
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
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "baseUrl",
        "storageKey": null
      },
      (v4/*: any*/),
      (v2/*: any*/),
      (v10/*: any*/)
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
      (v1/*: any*/),
      (v9/*: any*/),
      (v8/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelProviderCredentialId",
        "storageKey": null
      },
      (v3/*: any*/),
      (v4/*: any*/),
      (v5/*: any*/),
      (v6/*: any*/),
      (v7/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "modelDetailPageQuery",
    "selections": (v11/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelDetailPageQuery",
    "selections": (v11/*: any*/)
  },
  "params": {
    "cacheID": "3f584bc206ccad1d4ccfdd732c5508d9",
    "id": null,
    "metadata": {},
    "name": "modelDetailPageQuery",
    "operationKind": "query",
    "text": "query modelDetailPageQuery(\n  $platformModelId: ID!\n) {\n  PlatformModels {\n    id\n    modelProvider\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    isDefault\n    isAvailable\n    routeCount\n  }\n  PlatformModelRoutes(platformModelId: $platformModelId) {\n    id\n    platformModelProviderCredentialModelId\n    platformModelProviderCredentialModel {\n      id\n      isAvailable\n      modelId\n      name\n      platformModelProviderCredential {\n        id\n        name\n        modelProvider\n        status\n      }\n    }\n  }\n  PlatformModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    status\n  }\n  PlatformModelProviderCredentialModels {\n    id\n    isAvailable\n    isDefault\n    platformModelProviderCredentialId\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2d91ae60ee6c01c20e212eb77b28bced";

export default node;
