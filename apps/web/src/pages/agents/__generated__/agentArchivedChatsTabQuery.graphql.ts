/**
 * @generated SignedSource<<caec7b664fb802eeddeef7288379b6e8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type agentArchivedChatsTabQuery$variables = {
  after?: string | null | undefined;
  agentId: string;
  first: number;
};
export type agentArchivedChatsTabQuery$data = {
  readonly ArchivedAgentSessions: {
    readonly edges: ReadonlyArray<{
      readonly cursor: string;
      readonly node: {
        readonly agentId: string;
        readonly associatedTask: {
          readonly id: string;
          readonly name: string;
          readonly status: string;
        } | null | undefined;
        readonly createdAt: string;
        readonly id: string;
        readonly inferredTitle: string | null | undefined;
        readonly lastUserMessageAt: string | null | undefined;
        readonly updatedAt: string;
        readonly userSetTitle: string | null | undefined;
      };
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type agentArchivedChatsTabQuery = {
  response: agentArchivedChatsTabQuery$data;
  variables: agentArchivedChatsTabQuery$variables;
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
  "name": "agentId"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "first"
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v4 = [
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
        "name": "agentId",
        "variableName": "agentId"
      },
      {
        "kind": "Variable",
        "name": "first",
        "variableName": "first"
      }
    ],
    "concreteType": "SessionConnection",
    "kind": "LinkedField",
    "name": "ArchivedAgentSessions",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "SessionEdge",
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
            "concreteType": "Session",
            "kind": "LinkedField",
            "name": "node",
            "plural": false,
            "selections": [
              (v3/*: any*/),
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "agentId",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "concreteType": "SessionAssociatedTask",
                "kind": "LinkedField",
                "name": "associatedTask",
                "plural": false,
                "selections": [
                  (v3/*: any*/),
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "name",
                    "storageKey": null
                  },
                  {
                    "alias": null,
                    "args": null,
                    "kind": "ScalarField",
                    "name": "status",
                    "storageKey": null
                  }
                ],
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "inferredTitle",
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
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "lastUserMessageAt",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "userSetTitle",
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
    "name": "agentArchivedChatsTabQuery",
    "selections": (v4/*: any*/),
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
    "name": "agentArchivedChatsTabQuery",
    "selections": (v4/*: any*/)
  },
  "params": {
    "cacheID": "a73073d1b55b1af7f0e2bc834f620e5e",
    "id": null,
    "metadata": {},
    "name": "agentArchivedChatsTabQuery",
    "operationKind": "query",
    "text": "query agentArchivedChatsTabQuery(\n  $agentId: ID!\n  $first: Int!\n  $after: String\n) {\n  ArchivedAgentSessions(agentId: $agentId, first: $first, after: $after) {\n    edges {\n      cursor\n      node {\n        id\n        agentId\n        associatedTask {\n          id\n          name\n          status\n        }\n        inferredTitle\n        createdAt\n        updatedAt\n        lastUserMessageAt\n        userSetTitle\n      }\n    }\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "659acff57a36afb6194bc6b42a974a06";

export default node;
