/**
 * @generated SignedSource<<3a9d6debb64b2209dbd35bfb5a1b8345>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SessionMessageErrorKind = "CONTEXT_LENGTH_EXCEEDED" | "CYBERSECURITY_RISK" | "UNKNOWN" | "%future added value";
export type chatsPageDataSessionMessageUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageDataSessionMessageUpdatedSubscription$data = {
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
    readonly errorKind: SessionMessageErrorKind | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isError: boolean;
    readonly principalType: string;
    readonly role: string;
    readonly sessionId: string;
    readonly status: string;
    readonly taskRunId: string | null | undefined;
    readonly text: string;
    readonly toolCallId: string | null | undefined;
    readonly toolName: string | null | undefined;
    readonly turn: {
      readonly endedAt: string | null | undefined;
      readonly id: string;
      readonly startedAt: string;
    };
    readonly turnId: string;
    readonly updatedAt: string;
    readonly workflowRunId: string | null | undefined;
  };
};
export type chatsPageDataSessionMessageUpdatedSubscription = {
  response: chatsPageDataSessionMessageUpdatedSubscription$data;
  variables: chatsPageDataSessionMessageUpdatedSubscription$variables;
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
  "name": "toolCallId",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
},
v5 = [
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
      (v2/*: any*/),
      (v3/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "principalType",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "taskRunId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "workflowRunId",
        "storageKey": null
      },
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
          (v4/*: any*/),
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
          (v2/*: any*/),
          (v3/*: any*/)
        ],
        "storageKey": null
      },
      (v4/*: any*/),
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
        "name": "errorMessage",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "errorKind",
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
    "name": "chatsPageDataSessionMessageUpdatedSubscription",
    "selections": (v5/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionMessageUpdatedSubscription",
    "selections": (v5/*: any*/)
  },
  "params": {
    "cacheID": "824a2709910af95de5287c492c5ccec2",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionMessageUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionMessageUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionMessageUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    turnId\n    turn {\n      id\n      startedAt\n      endedAt\n    }\n    role\n    status\n    toolCallId\n    toolName\n    principalType\n    taskRunId\n    workflowRunId\n    contents {\n      type\n      text\n      data\n      mimeType\n      structuredContent\n      arguments\n      toolCallId\n      toolName\n    }\n    text\n    isError\n    errorMessage\n    errorKind\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "aad05f5b4906e402121955f6f2bcc35a";

export default node;
