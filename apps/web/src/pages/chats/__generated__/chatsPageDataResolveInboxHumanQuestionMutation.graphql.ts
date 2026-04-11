/**
 * @generated SignedSource<<3870686e809aca24e8f36c853db4dfba>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type ResolveInboxHumanQuestionInput = {
  customAnswerText?: string | null | undefined;
  inboxItemId: string;
  proposalId?: string | null | undefined;
};
export type chatsPageDataResolveInboxHumanQuestionMutation$variables = {
  input: ResolveInboxHumanQuestionInput;
};
export type chatsPageDataResolveInboxHumanQuestionMutation$data = {
  readonly ResolveInboxHumanQuestion: {
    readonly id: string;
  };
};
export type chatsPageDataResolveInboxHumanQuestionMutation = {
  response: chatsPageDataResolveInboxHumanQuestionMutation$data;
  variables: chatsPageDataResolveInboxHumanQuestionMutation$variables;
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
    "name": "ResolveInboxHumanQuestion",
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
    "name": "chatsPageDataResolveInboxHumanQuestionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataResolveInboxHumanQuestionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d1f7c7198365eea673c5def15e6a712c",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataResolveInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataResolveInboxHumanQuestionMutation(\n  $input: ResolveInboxHumanQuestionInput!\n) {\n  ResolveInboxHumanQuestion(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "1eee321cb835ea525f567a72eaa78063";

export default node;
