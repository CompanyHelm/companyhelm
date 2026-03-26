/**
 * @generated SignedSource<<6b1e783c16404f32f6ca3c332cc8184c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type githubInstallCallbackPageQuery$variables = Record<PropertyKey, never>;
export type githubInstallCallbackPageQuery$data = {
  readonly Me: {
    readonly company: {
      readonly id: string;
    };
  };
};
export type githubInstallCallbackPageQuery = {
  response: githubInstallCallbackPageQuery$data;
  variables: githubInstallCallbackPageQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Me",
    "kind": "LinkedField",
    "name": "Me",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AuthenticatedCompany",
        "kind": "LinkedField",
        "name": "company",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          }
        ],
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
    "name": "githubInstallCallbackPageQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "githubInstallCallbackPageQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "f4ce3afd6d6a19adbb2ff2d7336320a8",
    "id": null,
    "metadata": {},
    "name": "githubInstallCallbackPageQuery",
    "operationKind": "query",
    "text": "query githubInstallCallbackPageQuery {\n  Me {\n    company {\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "fd636f4f24c2c798c62cc17cd26f19af";

export default node;
