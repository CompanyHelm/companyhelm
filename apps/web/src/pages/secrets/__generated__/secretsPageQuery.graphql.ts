/**
 * @generated SignedSource<<aebe3af206f4b2e59e871f74084a6b26>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type secretsPageQuery$variables = Record<PropertyKey, never>;
export type secretsPageQuery$data = {
  readonly Secrets: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  }>;
};
export type secretsPageQuery = {
  response: secretsPageQuery$data;
  variables: secretsPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "Secrets",
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
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "envVarName",
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
    "name": "secretsPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "secretsPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "a7fa9b01b9b7503704f32237a3be3d3f",
    "id": null,
    "metadata": {},
    "name": "secretsPageQuery",
    "operationKind": "query",
    "text": "query secretsPageQuery {\n  Secrets {\n    id\n    name\n    description\n    envVarName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "f5037142b8afe460ab852676a8c9ed7d";

export default node;
