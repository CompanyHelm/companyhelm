/**
 * @generated SignedSource<<9009e3a8d402d046b0318430fec95c9e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type credentialDetailPageQuery$variables = {
  credentialId: string;
};
export type credentialDetailPageQuery$data = {
  readonly ModelProviderCredentialModels: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly updatedAt: string;
  }>;
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly id: string;
    readonly modelProvider: string;
  }>;
};
export type credentialDetailPageQuery = {
  response: credentialDetailPageQuery$data;
  variables: credentialDetailPageQuery$variables;
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
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
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
        "name": "modelProviderCredentialId",
        "variableName": "credentialId"
      }
    ],
    "concreteType": "ModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "ModelProviderCredentialModels",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "credentialDetailPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "bf5eb4e7df304705f74088f4a2f92b2c",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n) {\n  ModelProviderCredentials {\n    id\n    modelProvider\n  }\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    name\n    reasoningLevels\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "fd38bfcfef5cb425d00157fa0b7cba3d";

export default node;
