/**
 * @generated SignedSource<<000d573b064c025f4460fc2425e116e0>>
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
      readonly data: string | null | undefined;
      readonly mimeType: string | null | undefined;
      readonly structuredContent: any | null | undefined;
      readonly text: string | null | undefined;
      readonly toolCallId: string | null | undefined;
      readonly toolName: string | null | undefined;
      readonly type: string;
    }>;
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
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolCallId",
  "storageKey": null
},
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
},
v4 = [
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
      (v1/*: any*/),
      (v2/*: any*/),
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
          (v3/*: any*/),
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
          (v1/*: any*/),
          (v2/*: any*/)
        ],
        "storageKey": null
      },
      (v3/*: any*/),
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
    "selections": (v4/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "cce77dd6dbc3052abb869453064cf952",
    "id": null,
    "metadata": {},
    "name": "chatsPageSessionMessageUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageSessionMessageUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionMessageUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    role\n    status\n    toolCallId\n    toolName\n    contents {\n      type\n      text\n      data\n      mimeType\n      structuredContent\n      toolCallId\n      toolName\n    }\n    text\n    isError\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "a8ab83653a9b7d23cc71239b075db5d2";

export default node;
