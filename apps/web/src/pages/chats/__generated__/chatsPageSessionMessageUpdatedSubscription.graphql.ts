/**
 * @generated SignedSource<<4f0df4bc7e2fc7b2e3b02f78f3d34b56>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageSessionMessageUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageSessionMessageUpdatedSubscription$data = {
  readonly SessionMessageUpdated: {
    readonly createdAt: string;
    readonly id: string;
    readonly isError: boolean;
    readonly role: string;
    readonly sessionId: string;
    readonly status: string;
    readonly text: string;
    readonly toolCallId: string | null | undefined;
    readonly toolName: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type chatsPageSessionMessageUpdatedSubscription = {
  response: chatsPageSessionMessageUpdatedSubscription$data;
  variables: chatsPageSessionMessageUpdatedSubscription$variables;
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
    "name": "SessionMessageUpdated",
    "plural": false,
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
        "name": "toolCallId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "toolName",
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
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "selections": (v1/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "f1b7220a5dfb8c3d2a056d720ab29ceb",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionMessageUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionMessageUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    role\n    status\n    toolCallId\n    toolName\n    text\n    isError\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "5cdd7563b9cb17b494fc78104b6ade06";

export default node;
