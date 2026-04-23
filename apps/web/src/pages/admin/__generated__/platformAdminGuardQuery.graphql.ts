/**
 * @generated SignedSource<<c2ef27304b973f473448106b3bd40de3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type platformAdminGuardQuery$variables = Record<PropertyKey, never>;
export type platformAdminGuardQuery$data = {
  readonly Me: {
    readonly user: {
      readonly isPlatformAdmin: boolean;
    };
  };
};
export type platformAdminGuardQuery = {
  response: platformAdminGuardQuery$data;
  variables: platformAdminGuardQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "isPlatformAdmin",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "platformAdminGuardQuery",
    "selections": [
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
            "concreteType": "MeUser",
            "kind": "LinkedField",
            "name": "user",
            "plural": false,
            "selections": [
              (v0/*: any*/)
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "platformAdminGuardQuery",
    "selections": [
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
            "concreteType": "MeUser",
            "kind": "LinkedField",
            "name": "user",
            "plural": false,
            "selections": [
              (v0/*: any*/),
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
    ]
  },
  "params": {
    "cacheID": "318a85c78ea3fcedc122df8cefdb0974",
    "id": null,
    "metadata": {},
    "name": "platformAdminGuardQuery",
    "operationKind": "query",
    "text": "query platformAdminGuardQuery {\n  Me {\n    user {\n      isPlatformAdmin\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "96787829d3ae95ae4223bdd4dcf621f8";

export default node;
