/**
 * @generated SignedSource<<31b51cee4792bade8efd8bc2515ac4e0>>
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
    readonly createdAt: string;
    readonly id: string;
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
    "name": "SessionQueuedMessagesUpdated",
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
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "selections": (v1/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "f6e90f5ee2c5f44e945a6ee38a5330c2",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionQueuedMessagesUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionQueuedMessagesUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionQueuedMessagesUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    text\n    shouldSteer\n    status\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "02aa725b7d77e3e69a2879c000360cc3";

export default node;
