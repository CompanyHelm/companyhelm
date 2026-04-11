/**
 * @generated SignedSource<<9d416ff271469a980f81e8b45dba8c6d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription$variables = {
  sessionId: string;
};
export type chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription$data = {
  readonly SessionInboxHumanQuestionsUpdated: ReadonlyArray<{
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
export type chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription = {
  response: chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription$data;
  variables: chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "sessionId"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "sessionId",
        "variableName": "sessionId"
      }
    ],
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "SessionInboxHumanQuestionsUpdated",
    "plural": true,
    "selections": [
      (v1/*: any*/),
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
          (v1/*: any*/),
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
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription",
    "selections": (v2/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "21523a4f49af688a550716c2784defda",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription",
    "operationKind": "subscription",
    "text": "subscription chatsPageDataSessionInboxHumanQuestionsUpdatedSubscription(\n  $sessionId: ID!\n) {\n  SessionInboxHumanQuestionsUpdated(sessionId: $sessionId) {\n    id\n    sessionId\n    title\n    questionText\n    allowCustomAnswer\n    createdAt\n    proposals {\n      id\n      answerText\n      rating\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "ffc2179999d11a623279313a9f57862a";

export default node;
