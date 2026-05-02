/**
 * @generated SignedSource<<826766eb6a639ac91fff8296f773de5a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SessionMessageErrorKind = "CYBERSECURITY_RISK" | "UNKNOWN" | "%future added value";
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
    readonly principalAgentId: string | null | undefined;
    readonly principalSessionId: string | null | undefined;
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
      readonly sessionId: string;
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
v6 = [
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
        "kind": "ScalarField",
        "name": "principalType",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "principalAgentId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "principalSessionId",
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
    "selections": (v6/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionMessageUpdatedSubscription",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "a78c289503d7e4348c475b3ce6de0d68",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionMessageUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionMessageUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionMessageUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    turnId\n    turn {\n      id\n      sessionId\n      startedAt\n      endedAt\n    }\n    role\n    status\n    toolCallId\n    toolName\n    principalType\n    principalAgentId\n    principalSessionId\n    taskRunId\n    workflowRunId\n    contents {\n      type\n      text\n      data\n      mimeType\n      structuredContent\n      arguments\n      toolCallId\n      toolName\n    }\n    text\n    isError\n    errorMessage\n    errorKind\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "54175859f0bdce22cb10b6bdf7c28a38";

export default node;
