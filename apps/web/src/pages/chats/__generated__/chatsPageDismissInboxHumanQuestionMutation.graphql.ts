/**
 * @generated SignedSource<<cd2ff4997194613023dd7582d4a2ba55>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DismissInboxHumanQuestionInput = {
  inboxItemId: string;
};
export type chatsPageDismissInboxHumanQuestionMutation$variables = {
  input: DismissInboxHumanQuestionInput;
};
export type chatsPageDismissInboxHumanQuestionMutation$data = {
  readonly DismissInboxHumanQuestion: {
    readonly id: string;
    readonly status: string;
  };
};
export type chatsPageDismissInboxHumanQuestionMutation = {
  response: chatsPageDismissInboxHumanQuestionMutation$data;
  variables: chatsPageDismissInboxHumanQuestionMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "DismissInboxHumanQuestion",
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
        "name": "status",
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
    "name": "chatsPageDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7696fc9bb6408add3acdc86b90b29ee1",
    "id": null,
    "metadata": {},
    "name": "chatsPageDismissInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDismissInboxHumanQuestionMutation(\n  $input: DismissInboxHumanQuestionInput!\n) {\n  DismissInboxHumanQuestion(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "2cd1336add66d0935f5aeb312a908dc6";

export default node;
