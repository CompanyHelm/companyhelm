/**
 * @generated SignedSource<<3b29437d2a0fd860adca10023d63ab86>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageInboxHumanQuestionsUpdatedSubscription$variables = Record<PropertyKey, never>;
export type chatsPageInboxHumanQuestionsUpdatedSubscription$data = {
  readonly InboxHumanQuestionsUpdated: ReadonlyArray<{
    readonly allowCustomAnswer: boolean;
    readonly createdAt: string;
    readonly id: string;
    readonly proposals: ReadonlyArray<{
      readonly answerText: string;
      readonly id: string;
      readonly rating: number;
    }>;
    readonly questionText: string;
    readonly sessionId: string;
    readonly title: string;
  }>;
};
export type chatsPageInboxHumanQuestionsUpdatedSubscription = {
  response: chatsPageInboxHumanQuestionsUpdatedSubscription$data;
  variables: chatsPageInboxHumanQuestionsUpdatedSubscription$variables;
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
    "name": "InboxHumanQuestionsUpdated",
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
        "name": "title",
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
    "name": "chatsPageInboxHumanQuestionsUpdatedSubscription",
    "selections": (v1/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageInboxHumanQuestionsUpdatedSubscription",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4f44b70ce56473a661bfc30d055339a8",
    "id": null,
    "metadata": {},
    "name": "chatsPageInboxHumanQuestionsUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageInboxHumanQuestionsUpdatedSubscription {\n  InboxHumanQuestionsUpdated {\n    id\n    sessionId\n    title\n    questionText\n    allowCustomAnswer\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "24562322a77a5d6aeaa90b5df7bac037";

export default node;
