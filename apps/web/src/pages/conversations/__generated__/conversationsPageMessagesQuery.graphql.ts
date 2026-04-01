/**
 * @generated SignedSource<<46fa4fb9efb14703976a37cdb009281d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type conversationsPageMessagesQuery$variables = {
  conversationId?: string | null | undefined;
};
export type conversationsPageMessagesQuery$data = {
  readonly AgentConversationMessages: ReadonlyArray<{
    readonly authorAgentId: string;
    readonly authorAgentName: string;
    readonly authorParticipantId: string;
    readonly authorSessionId: string;
    readonly authorSessionTitle: string;
    readonly conversationId: string;
    readonly createdAt: string;
    readonly id: string;
    readonly text: string;
  }>;
};
export type conversationsPageMessagesQuery = {
  response: conversationsPageMessagesQuery$data;
  variables: conversationsPageMessagesQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "conversationId"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "conversationId",
        "variableName": "conversationId"
      }
    ],
    "concreteType": "AgentConversationMessage",
    "kind": "LinkedField",
    "name": "AgentConversationMessages",
    "plural": true,
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "conversationsPageMessagesQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "conversationsPageMessagesQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b4c8f8c963ddaac9da4661d1eaebd1d1",
    "id": null,
    "metadata": {},
    "name": "conversationsPageMessagesQuery",
    "operationKind": "query",
    "text": "query conversationsPageMessagesQuery(\n  $conversationId: ID\n) {\n  AgentConversationMessages(conversationId: $conversationId) {\n    id\n    conversationId\n    authorParticipantId\n    authorAgentId\n    authorAgentName\n    authorSessionId\n    authorSessionTitle\n    text\n    createdAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b969c4dd778e47979fe943b63e13d2e9";

export default node;
