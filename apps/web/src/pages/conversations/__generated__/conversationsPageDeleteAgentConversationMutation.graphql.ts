/**
 * @generated SignedSource<<656f7d5bac7cf8759d3578f876bc47e9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteAgentConversationInput = {
  conversationId: string;
};
export type conversationsPageDeleteAgentConversationMutation$variables = {
  input: DeleteAgentConversationInput;
};
export type conversationsPageDeleteAgentConversationMutation$data = {
  readonly DeleteAgentConversation: {
    readonly deletedConversationId: string;
  };
};
export type conversationsPageDeleteAgentConversationMutation = {
  response: conversationsPageDeleteAgentConversationMutation$data;
  variables: conversationsPageDeleteAgentConversationMutation$variables;
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
    "concreteType": "DeleteAgentConversationPayload",
    "kind": "LinkedField",
    "name": "DeleteAgentConversation",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "deletedConversationId",
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
    "name": "conversationsPageDeleteAgentConversationMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "conversationsPageDeleteAgentConversationMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "06a1abcd5f7b80cfc744757108de4b03",
    "id": null,
    "metadata": {},
    "name": "conversationsPageDeleteAgentConversationMutation",
    "operationKind": "mutation",
    "text": "mutation conversationsPageDeleteAgentConversationMutation(\n  $input: DeleteAgentConversationInput!\n) {\n  DeleteAgentConversation(input: $input) {\n    deletedConversationId\n  }\n}\n"
  }
};
})();

(node as any).hash = "97db7a4babab8058bc56e2b33ec4fc33";

export default node;
