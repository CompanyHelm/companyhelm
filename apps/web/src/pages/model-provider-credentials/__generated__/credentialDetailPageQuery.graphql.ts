/**
 * @generated SignedSource<<b617b23245b6eccda9e15ac9ad3ea735>>
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
v1 = [
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
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
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
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "78834fd31de15bbad907b910139718c6",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageQuery",
    "operationKind": "query",
    "text": "query credentialDetailPageQuery(\n  $credentialId: ID!\n) {\n  ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {\n    id\n    name\n    reasoningLevels\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b29c5d380addd483c4826c65c9efbfa1";

export default node;
