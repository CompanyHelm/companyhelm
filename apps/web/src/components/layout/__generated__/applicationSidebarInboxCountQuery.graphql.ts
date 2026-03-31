/**
 * @generated SignedSource<<b73b307a1aea1747ecd669173e877728>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type applicationSidebarInboxCountQuery$variables = Record<PropertyKey, never>;
export type applicationSidebarInboxCountQuery$data = {
  readonly InboxHumanQuestions: ReadonlyArray<{
    readonly id: string;
  }>;
};
export type applicationSidebarInboxCountQuery = {
  response: applicationSidebarInboxCountQuery$data;
  variables: applicationSidebarInboxCountQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "InboxHumanQuestions",
    "plural": true,
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
];
return {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "applicationSidebarInboxCountQuery",
    "selections": (v0/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "applicationSidebarInboxCountQuery",
    "selections": (v0/*: any*/)
  },
  "params": {
    "cacheID": "80c458543be0ec9ab20d656207877ea9",
    "id": null,
    "metadata": {},
    "name": "applicationSidebarInboxCountQuery",
    "operationKind": "query",
    "text": "query applicationSidebarInboxCountQuery {\n  InboxHumanQuestions {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "f5a474f2481d73183750a22c05d985e3";

export default node;
