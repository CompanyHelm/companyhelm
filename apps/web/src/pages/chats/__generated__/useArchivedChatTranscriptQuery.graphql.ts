/**
 * @generated SignedSource<<a99bfcf700c6f1c6ca07f0ed3be74627>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SessionMessageErrorKind = "CONTEXT_LENGTH_EXCEEDED" | "CYBERSECURITY_RISK" | "UNKNOWN" | "%future added value";
export type useArchivedChatTranscriptQuery$variables = {
  after?: string | null | undefined;
  first: number;
  sessionId: string;
};
export type useArchivedChatTranscriptQuery$data = {
  readonly ArchivedSessionTranscriptMessages: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
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
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type useArchivedChatTranscriptQuery = {
  response: useArchivedChatTranscriptQuery$data;
  variables: useArchivedChatTranscriptQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "after"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "sessionId"
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolCallId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
},
v7 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "after",
        "variableName": "after"
      },
      {
        "kind": "Variable",
        "name": "first",
        "variableName": "first"
      },
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "SessionTranscriptMessageConnection",
    "kind": "LinkedField",
    "name": "ArchivedSessionTranscriptMessages",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionTranscriptMessageEdge",
        "kind": "LinkedField",
        "name": "edges",
        "plural": true,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cursor",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "SessionMessage",
            "kind": "LinkedField",
            "name": "node",
            "plural": false,
            "selections": [
              (v3/*: any*/),
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
                  (v3/*: any*/),
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
              (v4/*: any*/),
              (v5/*: any*/),
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
                  (v6/*: any*/),
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
                  (v4/*: any*/),
                  (v5/*: any*/)
                ],
                "storageKey": null
              },
              (v6/*: any*/),
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
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "PageInfo",
        "kind": "LinkedField",
        "name": "pageInfo",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasNextPage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endCursor",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "useArchivedChatTranscriptQuery",
    "selections": (v7/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v2/*: any*/),
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "useArchivedChatTranscriptQuery",
    "selections": (v7/*: any*/)
  },
  "params": {
    "cacheID": "5b96122660f890d86abd4501e5e2fdf7",
    "id": null,
    "metadata": {},
    "name": "useArchivedChatTranscriptQuery",
    "operationKind": "query",
    "text": "query useArchivedChatTranscriptQuery(\n  $sessionId: ID!\n  $first: Int!\n  $after: String\n) {\n  ArchivedSessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        sessionId\n        turnId\n        turn {\n          id\n          startedAt\n          endedAt\n        }\n        role\n        status\n        toolCallId\n        toolName\n        principalType\n        taskRunId\n        workflowRunId\n        contents {\n          type\n          text\n          data\n          mimeType\n          structuredContent\n          arguments\n          toolCallId\n          toolName\n        }\n        text\n        isError\n        errorMessage\n        errorKind\n        createdAt\n        updatedAt\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "1ba346bbcd33904aa7587224ba224206";

export default node;
