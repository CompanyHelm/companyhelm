/**
 * @generated SignedSource<<658b86478b5b9718a0db785399be7817>>
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
export type chatsPageResolveInboxHumanQuestionMutation$variables = {
  input: ResolveInboxHumanQuestionInput;
};
export type chatsPageResolveInboxHumanQuestionMutation$data = {
  readonly ResolveInboxHumanQuestion: {
    readonly answer: {
      readonly id: string;
    } | null | undefined;
    readonly id: string;
    readonly status: string;
  };
};
export type chatsPageResolveInboxHumanQuestionMutation = {
  response: chatsPageResolveInboxHumanQuestionMutation$data;
  variables: chatsPageResolveInboxHumanQuestionMutation$variables;
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
    "name": "chatsPageResolveInboxHumanQuestionMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageResolveInboxHumanQuestionMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "8bd2d9e7f9c3da50f147b4174ba3d471",
    "id": null,
    "metadata": {},
    "name": "chatsPageResolveInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageResolveInboxHumanQuestionMutation(\n  $input: ResolveInboxHumanQuestionInput!\n) {\n  ResolveInboxHumanQuestion(input: $input) {\n    id\n    status\n    answer {\n      id\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "2547c44aceb9f2842910feffa7f7a525";

export default node;
