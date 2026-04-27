/**
 * @generated SignedSource<<40834f0e320f18ce4f8a009f855a7341>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type llmCredentialModelsPageQuery$variables = {
  credentialId: string;
};
export type llmCredentialModelsPageQuery$data = {
  readonly PlatformModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
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
    readonly defaultModelId: string | null | undefined;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
  }>;
};
export type llmCredentialModelsPageQuery = {
  response: llmCredentialModelsPageQuery$data;
  variables: llmCredentialModelsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "credentialId"
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
  "name": "name",
  "storageKey": null
},
v3 = [
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
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultModelId",
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
        "name": "platformModelProviderCredentialId",
        "variableName": "credentialId"
      }
    ],
    "concreteType": "PlatformModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "PlatformModelProviderCredentialModels",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelProviderCredentialId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelId",
        "storageKey": null
      },
      (v2/*: any*/),
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
    "name": "llmCredentialModelsPageQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialModelsPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "3d46e14738dbc3f848de9c9fe792cfa4",
    "id": null,
    "metadata": {},
    "name": "llmCredentialModelsPageQuery",
    "operationKind": "query",
    "text": "query llmCredentialModelsPageQuery(\n  $credentialId: ID!\n) {\n  PlatformModelProviderCredentials {\n    id\n    baseUrl\n    name\n    modelProvider\n    defaultModelId\n  }\n  PlatformModelProviderCredentialModels(platformModelProviderCredentialId: $credentialId) {\n    id\n    isDefault\n    platformModelProviderCredentialId\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "69a6e3113d3dc488704a28efe0a97414";

export default node;
