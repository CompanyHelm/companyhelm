/**
 * @generated SignedSource<<247b3a818e01bec27f4044f597fd6047>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageTranscriptQuery$variables = {
  after?: string | null | undefined;
  first: number;
  sessionId: string;
};
export type chatsPageTranscriptQuery$data = {
  readonly SessionTranscriptMessages: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly contents: ReadonlyArray<{
          readonly data: string | null | undefined;
          readonly mimeType: string | null | undefined;
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
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type chatsPageTranscriptQuery = {
  response: chatsPageTranscriptQuery$data;
  variables: chatsPageTranscriptQuery$variables;
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
    "name": "chatsPageTranscriptQuery",
    "selections": (v6/*: any*/),
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
    "name": "chatsPageTranscriptQuery",
    "selections": (v6/*: any*/)
  },
  "params": {
    "cacheID": "70e4ef072a089bf6ba688f606546ee64",
    "id": null,
    "metadata": {},
    "name": "chatsPageTranscriptQuery",
    "operationKind": "query",
    "text": "query chatsPageTranscriptQuery(\n  $sessionId: ID!\n  $first: Int!\n  $after: String\n) {\n  SessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        sessionId\n        role\n        status\n        toolCallId\n        toolName\n        contents {\n          type\n          text\n          data\n          mimeType\n          toolCallId\n          toolName\n        }\n        text\n        isError\n        createdAt\n        updatedAt\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "bcb4420e551bd9441caefbfe06559558";

export default node;
