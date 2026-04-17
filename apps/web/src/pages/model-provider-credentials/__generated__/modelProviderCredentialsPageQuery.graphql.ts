/**
 * @generated SignedSource<<fd7692714cd7b17842c3f6a1ef6c6b36>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelProviderCredentialsPageQuery$variables = Record<PropertyKey, never>;
export type modelProviderCredentialsPageQuery$data = {
  readonly AgentCreateOptions: ReadonlyArray<{
    readonly id: string;
    readonly isDefault: boolean;
    readonly label: string;
    readonly modelProviderCredentialId: string;
    readonly models: ReadonlyArray<{
      readonly modelProviderCredentialModelId: string;
    }>;
  }>;
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly name: string;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly createdAt: string;
    readonly defaultModelId: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly type: string;
    readonly updatedAt: string;
  }>;
  readonly ModelProviders: ReadonlyArray<{
    readonly authorizationInstructionsMarkdown: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly type: string;
  }>;
  readonly Sessions: ReadonlyArray<{
    readonly id: string;
    readonly modelProviderCredentialModelId: string | null | undefined;
  }>;
};
export type modelProviderCredentialsPageQuery = {
  response: modelProviderCredentialsPageQuery$data;
  variables: modelProviderCredentialsPageQuery$variables;
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
  "name": "name",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "concreteType": "Agent",
  "kind": "LinkedField",
  "name": "Agents",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
    (v2/*: any*/)
  ],
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isDefault",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialModelId",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProvider",
  "kind": "LinkedField",
  "name": "ModelProviders",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
    (v7/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "authorizationInstructionsMarkdown",
      "storageKey": null
    }
  ],
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProviderCredential",
  "kind": "LinkedField",
  "name": "ModelProviderCredentials",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v4/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "isManaged",
      "storageKey": null
    },
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelProvider",
      "storageKey": null
    },
    (v7/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "defaultModelId",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "errorMessage",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "refreshedAt",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "createdAt",
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
v10 = {
  "alias": null,
  "args": null,
  "concreteType": "Session",
  "kind": "LinkedField",
  "name": "Sessions",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v6/*: any*/)
  ],
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "modelProviderCredentialsPageQuery",
    "selections": [
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentCreateProviderOption",
        "kind": "LinkedField",
        "name": "AgentCreateOptions",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          (v2/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AgentCreateModelOption",
            "kind": "LinkedField",
            "name": "models",
            "plural": true,
            "selections": [
              (v6/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      (v8/*: any*/),
      (v9/*: any*/),
      (v10/*: any*/)
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "modelProviderCredentialsPageQuery",
    "selections": [
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentCreateProviderOption",
        "kind": "LinkedField",
        "name": "AgentCreateOptions",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          (v2/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AgentCreateModelOption",
            "kind": "LinkedField",
            "name": "models",
            "plural": true,
            "selections": [
              (v6/*: any*/),
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      (v8/*: any*/),
      (v9/*: any*/),
      (v10/*: any*/)
    ]
  },
  "params": {
    "cacheID": "f8eb4462454ff2b27b58054749115ba1",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageQuery",
    "operationKind": "query",
    "text": "query modelProviderCredentialsPageQuery {\n  Agents {\n    id\n    name\n    modelProviderCredentialId\n  }\n  AgentCreateOptions {\n    id\n    modelProviderCredentialId\n    isDefault\n    label\n    models {\n      modelProviderCredentialModelId\n      id\n    }\n  }\n  ModelProviders {\n    id\n    name\n    type\n    authorizationInstructionsMarkdown\n  }\n  ModelProviderCredentials {\n    id\n    isDefault\n    isManaged\n    name\n    modelProvider\n    type\n    defaultModelId\n    status\n    errorMessage\n    refreshedAt\n    createdAt\n    updatedAt\n  }\n  Sessions {\n    id\n    modelProviderCredentialModelId\n  }\n}\n"
  }
};
})();

(node as any).hash = "6425b9c56294810f383240d8265ef264";

export default node;
