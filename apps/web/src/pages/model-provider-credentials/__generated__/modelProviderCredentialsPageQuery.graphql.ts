/**
 * @generated SignedSource<<7c4b51d477033c45443c565d84d57546>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type modelProviderCredentialsPageQuery$variables = Record<PropertyKey, never>;
export type modelProviderCredentialsPageQuery$data = {
  readonly ModelProviderCredentials: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly updatedAt: string;
  }>;
};
export type modelProviderCredentialsPageQuery = {
  response: modelProviderCredentialsPageQuery$data;
  variables: modelProviderCredentialsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "ModelProviderCredentials",
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
        "name": "modelProvider",
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
    "name": "modelProviderCredentialsPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "modelProviderCredentialsPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "ae91684cdda067339d90e5ed16ebf486",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageQuery",
    "operationKind": "query",
    "text": "query modelProviderCredentialsPageQuery {\n  ModelProviderCredentials {\n    id\n    name\n    modelProvider\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "15db921ac2c40a7fccf951a200e988f3";

export default node;
