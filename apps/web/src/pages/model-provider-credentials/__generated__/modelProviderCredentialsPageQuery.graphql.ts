/**
 * @generated SignedSource<<0e8c8d3c4aaa0a523b1a8f29a82894b5>>
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
    readonly modelCredentialSource: string;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly models: ReadonlyArray<{
      readonly modelProviderCredentialModelId: string | null | undefined;
    }>;
  }>;
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly name: string;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly createdAt: string;
    readonly defaultModelId: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
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
  "name": "modelCredentialSource",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isDefault",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "label",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "modelProviderCredentialModelId",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "type",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProvider",
  "kind": "LinkedField",
  "name": "ModelProviders",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
    (v8/*: any*/),
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
v10 = {
  "alias": null,
  "args": null,
  "concreteType": "ModelProviderCredential",
  "kind": "LinkedField",
  "name": "ModelProviderCredentials",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "baseUrl",
      "storageKey": null
    },
    (v5/*: any*/),
    (v1/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "modelProvider",
      "storageKey": null
    },
    (v8/*: any*/),
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
v11 = {
  "alias": null,
  "args": null,
  "concreteType": "Session",
  "kind": "LinkedField",
  "name": "Sessions",
  "plural": true,
  "selections": [
    (v0/*: any*/),
    (v7/*: any*/)
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
          (v4/*: any*/),
          (v2/*: any*/),
          (v5/*: any*/),
          (v6/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AgentCreateModelOption",
            "kind": "LinkedField",
            "name": "models",
            "plural": true,
            "selections": [
              (v7/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      (v9/*: any*/),
      (v10/*: any*/),
      (v11/*: any*/)
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
          (v4/*: any*/),
          (v2/*: any*/),
          (v5/*: any*/),
          (v6/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "AgentCreateModelOption",
            "kind": "LinkedField",
            "name": "models",
            "plural": true,
            "selections": [
              (v7/*: any*/),
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      (v9/*: any*/),
      (v10/*: any*/),
      (v11/*: any*/)
    ]
  },
  "params": {
    "cacheID": "9e30e50bf30605401925c4ebf8d6dfeb",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageQuery",
    "operationKind": "query",
    "text": "query modelProviderCredentialsPageQuery {\n  Agents {\n    id\n    name\n    modelProviderCredentialId\n  }\n  AgentCreateOptions {\n    id\n    modelCredentialSource\n    modelProviderCredentialId\n    isDefault\n    label\n    models {\n      modelProviderCredentialModelId\n      id\n    }\n  }\n  ModelProviders {\n    id\n    name\n    type\n    authorizationInstructionsMarkdown\n  }\n  ModelProviderCredentials {\n    id\n    baseUrl\n    isDefault\n    name\n    modelProvider\n    type\n    defaultModelId\n    status\n    errorMessage\n    refreshedAt\n    createdAt\n    updatedAt\n  }\n  Sessions {\n    id\n    modelProviderCredentialModelId\n  }\n}\n"
  }
};
})();

(node as any).hash = "87f10168c16435e7d00ce208b508b0b4";

export default node;
