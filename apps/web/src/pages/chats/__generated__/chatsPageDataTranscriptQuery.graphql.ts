/**
 * @generated SignedSource<<5b17b3ff9273dd0c6d440f02013f3a2a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataTranscriptQuery$variables = {
  after?: string | null | undefined;
  first: number;
  sessionId: string;
};
export type chatsPageDataTranscriptQuery$data = {
  readonly SessionTranscriptMessages: {
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
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type chatsPageDataTranscriptQuery = {
  response: chatsPageDataTranscriptQuery$data;
  variables: chatsPageDataTranscriptQuery$variables;
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
  "name": "sessionId",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolCallId",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "toolName",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "text",
  "storageKey": null
},
v8 = [
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
    "name": "SessionTranscriptMessages",
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
              (v4/*: any*/),
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
                  (v4/*: any*/),
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
              (v5/*: any*/),
              (v6/*: any*/),
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
                  (v7/*: any*/),
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
                  (v5/*: any*/),
                  (v6/*: any*/)
                ],
                "storageKey": null
              },
              (v7/*: any*/),
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
    "name": "chatsPageDataTranscriptQuery",
    "selections": (v8/*: any*/),
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
    "name": "chatsPageDataTranscriptQuery",
    "selections": (v8/*: any*/)
  },
  "params": {
    "cacheID": "bdaf7d518b3e61ba5f0e6d7eeb784c03",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataTranscriptQuery",
    "operationKind": "query",
    "text": "query chatsPageDataTranscriptQuery(\n  $sessionId: ID!\n  $first: Int!\n  $after: String\n) {\n  SessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        sessionId\n        turnId\n        turn {\n          id\n          sessionId\n          startedAt\n          endedAt\n        }\n        role\n        status\n        toolCallId\n        toolName\n        contents {\n          type\n          text\n          data\n          mimeType\n          structuredContent\n          arguments\n          toolCallId\n          toolName\n        }\n        text\n        isError\n        errorMessage\n        createdAt\n        updatedAt\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "798bf96a4827494a92ab726cf7354f9d";

export default node;
