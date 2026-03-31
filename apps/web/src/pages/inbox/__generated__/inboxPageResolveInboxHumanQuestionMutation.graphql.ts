/**
 * @generated SignedSource<<ad5537c2bb3b5ef70e7a5ac29b7bd060>>
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
export type inboxPageResolveInboxHumanQuestionMutation$variables = {
  input: ResolveInboxHumanQuestionInput;
};
export type inboxPageResolveInboxHumanQuestionMutation$data = {
  readonly ResolveInboxHumanQuestion: {
    readonly answer: {
      readonly id: string;
    } | null | undefined;
    readonly id: string;
    readonly status: string;
  };
};
export type inboxPageResolveInboxHumanQuestionMutation = {
  response: inboxPageResolveInboxHumanQuestionMutation$data;
  variables: inboxPageResolveInboxHumanQuestionMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
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
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "InboxHumanQuestion",
    "kind": "LinkedField",
    "name": "ResolveInboxHumanQuestion",
    "plural": false,
    "selections": [
      (v1/*: any*/),
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
        "concreteType": "InboxHumanQuestionAnswer",
        "kind": "LinkedField",
        "name": "answer",
        "plural": false,
        "selections": [
          (v1/*: any*/)
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
    "name": "inboxPageResolveInboxHumanQuestionMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "inboxPageResolveInboxHumanQuestionMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "7f39dbdc774d86cd3ec5745894316c4e",
    "id": null,
    "metadata": {},
    "name": "inboxPageResolveInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation inboxPageResolveInboxHumanQuestionMutation(\n  $input: ResolveInboxHumanQuestionInput!\n) {\n  ResolveInboxHumanQuestion(input: $input) {\n    id\n    status\n    answer {\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "03dffadd546b107f15cd8abd28d3525f";

export default node;
