/**
 * @generated SignedSource<<75049f13ac607cc64f77d5a1c540650a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription$data = {
  readonly SessionQueuedMessagesUpdated: ReadonlyArray<{
    readonly createdAt: string;
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
export type chatsPageDataSessionQueuedMessagesUpdatedSubscription = {
  response: chatsPageDataSessionQueuedMessagesUpdatedSubscription$data;
  variables: chatsPageDataSessionQueuedMessagesUpdatedSubscription$variables;
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
    "name": "SessionQueuedMessagesUpdated",
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
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "751c86b4f92df736e3d82e9fcf61a8c4",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionQueuedMessagesUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionQueuedMessagesUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionQueuedMessagesUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    images {\n      id\n      base64EncodedImage\n      mimeType\n    }\n    shouldSteer\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b17c03a2459405b51f1483215d52f8f6";

export default node;
