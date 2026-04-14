/**
 * @generated SignedSource<<65b2132ee7d7f1df47a1ac356e6e3912>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type secretGroupsPageQuery$variables = Record<PropertyKey, never>;
export type secretGroupsPageQuery$data = {
  readonly SecretGroups: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
  }>;
  readonly Secrets: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
  }>;
};
export type secretGroupsPageQuery = {
  response: secretGroupsPageQuery$data;
  variables: secretGroupsPageQuery$variables;
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
  {
    "alias": null,
    "args": null,
    "concreteType": "SecretGroup",
    "kind": "LinkedField",
    "name": "SecretGroups",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
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
        "name": "secretGroupId",
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
    "name": "secretGroupsPageQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "secretGroupsPageQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "db3d68c8575611303b0e13b99cba55ba",
    "id": null,
    "metadata": {},
    "name": "secretGroupsPageQuery",
    "operationKind": "query",
    "text": "query secretGroupsPageQuery {\n  SecretGroups {\n    id\n    name\n  }\n  Secrets {\n    id\n    name\n    secretGroupId\n  }\n}\n"
  }
};
})();

(node as any).hash = "5ef9a8505176ec1b77917ea4be942918";

export default node;
