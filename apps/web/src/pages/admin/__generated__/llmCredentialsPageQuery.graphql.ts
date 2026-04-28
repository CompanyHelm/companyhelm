/**
 * @generated SignedSource<<b022c45c27107678b5a75ffa132e850a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type llmCredentialsPageQuery$variables = Record<PropertyKey, never>;
export type llmCredentialsPageQuery$data = {
  readonly ModelProviders: ReadonlyArray<{
    readonly authorizationInstructionsMarkdown: string | null | undefined;
    readonly id: string;
    readonly name: string;
    readonly type: string;
  }>;
  readonly PlatformModelProviderCredentials: ReadonlyArray<{
    readonly baseUrl: string | null | undefined;
    readonly createdAt: string;
    readonly defaultModelId: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly type: string;
    readonly updatedAt: string;
  }>;
};
export type llmCredentialsPageQuery = {
  response: llmCredentialsPageQuery$data;
  variables: llmCredentialsPageQuery$variables;
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
  "name": "type",
  "storageKey": null
},
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProvider",
    "kind": "LinkedField",
    "name": "ModelProviders",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/),
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
  {
    "alias": null,
    "args": null,
    "concreteType": "PlatformModelProviderCredential",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentials",
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
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      },
      (v2/*: any*/),
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
  }
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "llmCredentialsPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "llmCredentialsPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "50bbe743932f840fe229bfaedbacbd5b",
    "id": null,
    "metadata": {},
    "name": "llmCredentialsPageQuery",
    "operationKind": "query",
    "text": "query llmCredentialsPageQuery {\n  ModelProviders {\n    id\n    name\n    type\n    authorizationInstructionsMarkdown\n  }\n  PlatformModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    type\n    defaultModelId\n    status\n    errorMessage\n    refreshedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "afc28982eabc9c3b5d5b96f284593d31";

export default node;
