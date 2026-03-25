/**
 * @generated SignedSource<<1988b83aea10aab39a168c7ad9f52df9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type applicationSidebarVersionQuery$variables = Record<PropertyKey, never>;
export type applicationSidebarVersionQuery$data = {
  readonly Me: {
    readonly serverVersion: string;
  };
};
export type applicationSidebarVersionQuery = {
  response: applicationSidebarVersionQuery$data;
  variables: applicationSidebarVersionQuery$variables;
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
        "kind": "ScalarField",
        "name": "serverVersion",
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
    "name": "applicationSidebarVersionQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "applicationSidebarVersionQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "abcc4122993ddb1fe54c3d03472ab638",
    "id": null,
    "metadata": {},
    "name": "applicationSidebarVersionQuery",
    "operationKind": "query",
    "text": "query applicationSidebarVersionQuery {\n  Me {\n    serverVersion\n  }\n}\n"
  }
};
})();

(node as any).hash = "ea7273377f0324d37b5ef352eec58a31";

export default node;
