/**
 * @generated SignedSource<<9006b7c424e28d0d9a4b2864a1dd1a29>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type inboxPageQuery$variables = Record<PropertyKey, never>;
export type inboxPageQuery$data = {
  readonly InboxHumanQuestions: ReadonlyArray<{
    readonly agentId: string;
    readonly agentName: string;
    readonly allowCustomAnswer: boolean;
    readonly createdAt: string;
    readonly id: string;
    readonly proposals: ReadonlyArray<{
      readonly answerText: string;
      readonly cons: ReadonlyArray<string>;
      readonly id: string;
      readonly pros: ReadonlyArray<string>;
      readonly rating: number;
    }>;
    readonly questionText: string;
    readonly sessionId: string;
    readonly sessionTitle: string;
    readonly status: string;
    readonly summary: string;
    readonly title: string;
  }>;
};
export type inboxPageQuery = {
  response: inboxPageQuery$data;
  variables: inboxPageQuery$variables;
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
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "InboxHumanQuestions",
    "plural": true,
    "selections": [
      (v0/*: any*/),
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
      },
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
        "name": "title",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "summary",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "questionText",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "allowCustomAnswer",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
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
        "concreteType": "InboxHumanQuestionProposal",
        "kind": "LinkedField",
        "name": "proposals",
        "plural": true,
        "selections": [
          (v0/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "answerText",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "rating",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "pros",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cons",
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
    "name": "inboxPageQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "inboxPageQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5a8eb5f5103e3a696407f9f1c4b24962",
    "id": null,
    "metadata": {},
    "name": "inboxPageQuery",
    "operationKind": "query",
    "text": "query inboxPageQuery {\n  InboxHumanQuestions {\n    id\n    sessionId\n    sessionTitle\n    agentId\n    agentName\n    title\n    summary\n    questionText\n    allowCustomAnswer\n    status\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n      pros\n      cons\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "54f444d392afc36c3454d74ede56a708";

export default node;
