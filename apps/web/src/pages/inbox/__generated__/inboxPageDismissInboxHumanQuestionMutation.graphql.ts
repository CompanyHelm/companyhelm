/**
 * @generated SignedSource<<755772efeef496640f894552211f7236>>
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
export type inboxPageDismissInboxHumanQuestionMutation$variables = {
  input: DismissInboxHumanQuestionInput;
};
export type inboxPageDismissInboxHumanQuestionMutation$data = {
  readonly DismissInboxHumanQuestion: {
    readonly id: string;
    readonly status: string;
  };
};
export type inboxPageDismissInboxHumanQuestionMutation = {
  response: inboxPageDismissInboxHumanQuestionMutation$data;
  variables: inboxPageDismissInboxHumanQuestionMutation$variables;
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
    "name": "inboxPageDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "inboxPageDismissInboxHumanQuestionMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "eb032a9390d67d35ea934a10c1b5232e",
    "id": null,
    "metadata": {},
    "name": "inboxPageDismissInboxHumanQuestionMutation",
    "operationKind": "mutation",
    "text": "mutation inboxPageDismissInboxHumanQuestionMutation(\n  $input: DismissInboxHumanQuestionInput!\n) {\n  DismissInboxHumanQuestion(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "71f88f993767c92d3f3ce6f41db3fda5";

export default node;
