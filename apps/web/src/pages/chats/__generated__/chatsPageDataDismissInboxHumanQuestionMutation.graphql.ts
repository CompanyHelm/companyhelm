/**
 * @generated SignedSource<<a9b2e775da2a28849e291ea3b826448a>>
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
export type chatsPageDataDismissInboxHumanQuestionMutation$variables = {
  input: DismissInboxHumanQuestionInput;
};
export type chatsPageDataDismissInboxHumanQuestionMutation$data = {
  readonly DismissInboxHumanQuestion: {
    readonly id: string;
  };
};
export type chatsPageDataDismissInboxHumanQuestionMutation = {
  response: chatsPageDataDismissInboxHumanQuestionMutation$data;
  variables: chatsPageDataDismissInboxHumanQuestionMutation$variables;
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
    "name": "chatsPageDataDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5f541fdfb70b48ad5c32bebfb64a4eaf",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataDismissInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataDismissInboxHumanQuestionMutation(\n  $input: DismissInboxHumanQuestionInput!\n) {\n  DismissInboxHumanQuestion(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "95baea8871dc96f9497acbc1849673dd";

export default node;
