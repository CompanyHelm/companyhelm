/**
 * @generated SignedSource<<e7e2e35330d436c664937096e6aadf89>>
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
    readonly contents: ReadonlyArray<{
      readonly arguments: any | null | undefined;
      readonly data: string | null | undefined;
      readonly mimeType: string | null | undefined;
      readonly structuredContent: any | null | undefined;
      readonly text: string | null | undefined;
      readonly toolCallId: string | null | undefined;
      readonly toolName: string | null | undefined;
      readonly type: string;
    }>;
    readonly createdAt: string;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isError: boolean;
    readonly role: string;
    readonly sessionId: string;
    readonly status: string;
    readonly text: string;
    readonly toolCallId: string | null | undefined;
    readonly toolName: string | null | undefined;
    readonly turn: {
      readonly endedAt: string | null | undefined;
      readonly id: string;
      readonly sessionId: string;
      readonly startedAt: string;
    };
    readonly turnId: string;
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
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "sessionId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolCallId",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "errorMessage",
  "storageKey": null
},
v7 = [
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
      (v1/*: any*/),
      (v2/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "turnId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionTurn",
        "kind": "LinkedField",
        "name": "turn",
        "plural": false,
        "selections": [
          (v1/*: any*/),
          (v2/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "startedAt",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endedAt",
            "storageKey": null
          }
        ],
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
      (v3/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionMessageContent",
        "kind": "LinkedField",
        "name": "contents",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "type",
            "storageKey": null
          },
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "data",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "mimeType",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "structuredContent",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "arguments",
            "storageKey": null
          },
          (v3/*: any*/),
          (v4/*: any*/)
        ],
        "storageKey": null
      },
      (v5/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isError",
        "storageKey": null
      },
      (v6/*: any*/),
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
    "selections": (v7/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "7f969d5f8906a6739c2b6b5981d48ed2",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionMessageUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionMessageUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    turnId\n    turn {\n      id\n      sessionId\n      startedAt\n      endedAt\n    }\n    role\n    status\n    toolCallId\n    toolName\n    contents {\n      type\n      text\n      data\n      mimeType\n      structuredContent\n      arguments\n      toolCallId\n      toolName\n    }\n    text\n    isError\n    errorMessage\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "dc130d49312a80896ffab466f361a1e9";

export default node;
