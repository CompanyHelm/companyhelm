/**
 * @generated SignedSource<<82b347d97cad0b7c668f98e9e842193e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageTranscriptQuery$variables = {
  sessionId: string;
};
export type chatsPageTranscriptQuery$data = {
  readonly SessionTranscriptMessages: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly isError: boolean;
    readonly role: string;
    readonly sessionId: string;
    readonly status: string;
    readonly text: string;
    readonly updatedAt: string;
  }>;
};
export type chatsPageTranscriptQuery = {
  response: chatsPageTranscriptQuery$data;
  variables: chatsPageTranscriptQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "SessionMessage",
    "kind": "LinkedField",
    "name": "SessionTranscriptMessages",
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
        "name": "sessionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "role",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "text",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isError",
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
    "name": "chatsPageTranscriptQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageTranscriptQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "13c112a00de4e76ddce181e8720d4b46",
    "id": null,
    "metadata": {},
    "name": "chatsPageTranscriptQuery",
    "operationKind": "query",
    "text": "query chatsPageTranscriptQuery(\n  $sessionId: ID!\n) {\n  SessionTranscriptMessages(sessionId: $sessionId) {\n    id\n    sessionId\n    role\n    status\n    text\n    isError\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "2e92f2ba8b93902244a62a4d275f78a7";

export default node;
