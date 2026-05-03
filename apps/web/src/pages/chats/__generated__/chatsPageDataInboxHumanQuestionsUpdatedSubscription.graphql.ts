/**
 * @generated SignedSource<<9ce3033dd947f0b8403d9c79e2dceecc>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataInboxHumanQuestionsUpdatedSubscription$variables = Record<PropertyKey, never>;
export type chatsPageDataInboxHumanQuestionsUpdatedSubscription$data = {
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
export type chatsPageDataInboxHumanQuestionsUpdatedSubscription = {
  response: chatsPageDataInboxHumanQuestionsUpdatedSubscription$data;
  variables: chatsPageDataInboxHumanQuestionsUpdatedSubscription$variables;
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
    "name": "chatsPageDataInboxHumanQuestionsUpdatedSubscription",
    "selections": (v1/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "chatsPageDataInboxHumanQuestionsUpdatedSubscription",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "510932a527d6bdb89c7c47d62063891a",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataInboxHumanQuestionsUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataInboxHumanQuestionsUpdatedSubscription {\n  InboxHumanQuestionsUpdated {\n    id\n    sessionId\n    title\n    questionText\n    allowCustomAnswer\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "b881e047528422a6227e249dfe6e1536";

export default node;
