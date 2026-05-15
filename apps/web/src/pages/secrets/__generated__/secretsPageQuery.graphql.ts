/**
 * @generated SignedSource<<31ec812dd7a8fd69c1c22fec6776a772>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type secretsPageQuery$variables = Record<PropertyKey, never>;
export type secretsPageQuery$data = {
  readonly Agents: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly SecretGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Secrets: ReadonlyArray<{
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
    readonly updatedAt: string;
  }>;
};
export type secretsPageQuery = {
  response: secretsPageQuery$data;
  variables: secretsPageQuery$variables;
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
v2 = [
  (v0/*: any*/),
  (v1/*: any*/)
],
v3 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "Agents",
    "plural": true,
    "selections": (v2/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "SecretGroup",
    "kind": "LinkedField",
    "name": "SecretGroups",
    "plural": true,
    "selections": (v2/*: any*/),
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "Secrets",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/),
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
        "name": "secretGroupId",
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
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "secretsPageQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "bdae6424fb6982791dc928563b0ad89f",
    "id": null,
    "metadata": {},
    "name": "secretsPageQuery",
    "operationKind": "query",
    "text": "query secretsPageQuery {\n  Agents {\n    id\n    name\n  }\n  SecretGroups {\n    id\n    name\n  }\n  Secrets {\n    id\n    name\n    description\n    envVarName\n    secretGroupId\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4554aeec8b3d0d6527eda92f723427d3";

export default node;
