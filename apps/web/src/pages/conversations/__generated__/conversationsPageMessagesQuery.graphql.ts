/**
 * @generated SignedSource<<0b37ab8229d949c823a0b669618e76f6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type conversationsPageMessagesQuery$variables = {
  after?: string | null | undefined;
  conversationId?: string | null | undefined;
  first: number;
};
export type conversationsPageMessagesQuery$data = {
  readonly AgentConversationMessages: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly authorAgentId: string;
        readonly authorAgentName: string;
        readonly authorParticipantId: string;
        readonly authorSessionId: string;
        readonly authorSessionTitle: string;
        readonly conversationId: string;
        readonly createdAt: string;
        readonly id: string;
        readonly text: string;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type conversationsPageMessagesQuery = {
  response: conversationsPageMessagesQuery$data;
  variables: conversationsPageMessagesQuery$variables;
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
  "name": "conversationId"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v3 = [
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
        "name": "conversationId",
        "variableName": "conversationId"
      },
      {
        "kind": "Variable",
        "name": "first",
        "variableName": "first"
      }
    ],
    "concreteType": "AgentConversationMessageConnection",
    "kind": "LinkedField",
    "name": "AgentConversationMessages",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentConversationMessageEdge",
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
            "concreteType": "AgentConversationMessage",
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
                "name": "conversationId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "authorParticipantId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "authorAgentId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "authorAgentName",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "authorSessionId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "authorSessionTitle",
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
                "name": "createdAt",
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
            "name": "endCursor",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasNextPage",
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
    "name": "conversationsPageMessagesQuery",
    "selections": (v3/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "conversationsPageMessagesQuery",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "848a7799a2ce959723ef1bbbf7e6a282",
    "id": null,
    "metadata": {},
    "name": "conversationsPageMessagesQuery",
    "operationKind": "query",
    "text": "query conversationsPageMessagesQuery(\n  $conversationId: ID\n  $first: Int!\n  $after: String\n) {\n  AgentConversationMessages(conversationId: $conversationId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        conversationId\n        authorParticipantId\n        authorAgentId\n        authorAgentName\n        authorSessionId\n        authorSessionTitle\n        text\n        createdAt\n      }\n    }\n    pageInfo {\n      endCursor\n      hasNextPage\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "1feccd6ab681d61ed0be07c8c69ec881";

export default node;
