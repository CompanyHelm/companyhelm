/**
 * @generated SignedSource<<8f55b4f8c3d9572944abb397d97e1c97>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageQueuedMessagesQuery$variables = {
  sessionId: string;
};
export type chatsPageQueuedMessagesQuery$data = {
  readonly SessionQueuedMessages: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly sessionId: string;
    readonly shouldSteer: boolean;
    readonly status: string;
    readonly text: string;
    readonly updatedAt: string;
  }>;
};
export type chatsPageQueuedMessagesQuery = {
  response: chatsPageQueuedMessagesQuery$data;
  variables: chatsPageQueuedMessagesQuery$variables;
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
    "concreteType": "SessionQueuedMessage",
    "kind": "LinkedField",
    "name": "SessionQueuedMessages",
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
        "name": "text",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "shouldSteer",
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
    "name": "chatsPageQueuedMessagesQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageQueuedMessagesQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "34fa591fbd6aae3465a12181bba01b28",
    "id": null,
    "metadata": {},
    "name": "chatsPageQueuedMessagesQuery",
    "operationKind": "query",
    "text": "query chatsPageQueuedMessagesQuery(\n  $sessionId: ID!\n) {\n  SessionQueuedMessages(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    shouldSteer\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "ce7c10f3d4927d73327cddc60bd771c1";

export default node;
