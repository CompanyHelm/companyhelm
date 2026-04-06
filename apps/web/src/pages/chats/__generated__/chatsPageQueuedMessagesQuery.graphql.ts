/**
 * @generated SignedSource<<868a3bf2ed367ee562896f0b9feab3c1>>
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
    readonly claimedAt: string | null | undefined;
    readonly createdAt: string;
    readonly dispatchedAt: string | null | undefined;
    readonly id: string;
    readonly images: ReadonlyArray<{
      readonly base64EncodedImage: string;
      readonly id: string;
      readonly mimeType: string;
    }>;
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
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
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
      (v1/*: any*/),
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
        "concreteType": "SessionQueuedMessageImage",
        "kind": "LinkedField",
        "name": "images",
        "plural": true,
        "selections": [
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "base64EncodedImage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "mimeType",
            "storageKey": null
          }
        ],
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
        "name": "claimedAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "dispatchedAt",
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
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageQueuedMessagesQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "fddabeb7aea7c441aa0b5db6b2d57687",
    "id": null,
    "metadata": {},
    "name": "chatsPageQueuedMessagesQuery",
    "operationKind": "query",
    "text": "query chatsPageQueuedMessagesQuery(\n  $sessionId: ID!\n) {\n  SessionQueuedMessages(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    images {\n      id\n      base64EncodedImage\n      mimeType\n    }\n    shouldSteer\n    status\n    claimedAt\n    dispatchedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "0800ee61d31167044131815fb2849173";

export default node;
