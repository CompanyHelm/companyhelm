/**
 * @generated SignedSource<<6c7babaf0ab5aad93af3d2ecd2b15a05>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type conversationsPageListQuery$variables = Record<PropertyKey, never>;
export type conversationsPageListQuery$data = {
  readonly AgentConversations: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly latestMessageAt: string | null | undefined;
    readonly latestMessagePreview: string | null | undefined;
    readonly participants: ReadonlyArray<{
      readonly agentId: string;
      readonly agentName: string;
      readonly id: string;
      readonly sessionId: string;
      readonly sessionTitle: string;
    }>;
    readonly updatedAt: string;
  }>;
};
export type conversationsPageListQuery = {
  response: conversationsPageListQuery$data;
  variables: conversationsPageListQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v1 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "AgentConversation",
    "kind": "LinkedField",
    "name": "AgentConversations",
    "plural": true,
    "selections": [
      (v0/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "latestMessagePreview",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "latestMessageAt",
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
        "concreteType": "AgentConversationParticipant",
        "kind": "LinkedField",
        "name": "participants",
        "plural": true,
        "selections": [
          (v0/*: any*/),
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
            "kind": "ScalarField",
            "name": "agentName",
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
            "name": "sessionTitle",
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
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "conversationsPageListQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "conversationsPageListQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "cf5b70e8de38ed2e3cb8d33c8a37361d",
    "id": null,
    "metadata": {},
    "name": "conversationsPageListQuery",
    "operationKind": "query",
    "text": "query conversationsPageListQuery {\n  AgentConversations {\n    id\n    latestMessagePreview\n    latestMessageAt\n    createdAt\n    updatedAt\n    participants {\n      id\n      agentId\n      agentName\n      sessionId\n      sessionTitle\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "d0189b9779ad03cc1e1a1acbc7d67f7b";

export default node;
