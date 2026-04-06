/**
 * @generated SignedSource<<fa379fcd577124832c5c2069f62ddec4>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageSessionQueuedMessagesUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageSessionQueuedMessagesUpdatedSubscription$data = {
  readonly SessionQueuedMessagesUpdated: ReadonlyArray<{
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
export type chatsPageSessionQueuedMessagesUpdatedSubscription = {
  response: chatsPageSessionQueuedMessagesUpdatedSubscription$data;
  variables: chatsPageSessionQueuedMessagesUpdatedSubscription$variables;
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
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "9ed679e0a1d71a59b8241b34549a1902",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionQueuedMessagesUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionQueuedMessagesUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    images {\n      id\n      base64EncodedImage\n      mimeType\n    }\n    shouldSteer\n    status\n    claimedAt\n    dispatchedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c04f8ae669f9c4558b4393c38e7c57e3";

export default node;
