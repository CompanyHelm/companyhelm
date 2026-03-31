/**
 * @generated SignedSource<<c9f234287f3cb01bf6d2a4bfdbbc1ef6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSecretFromAgentInput = {
  agentId: string;
  secretId: string;
};
export type agentSecretDefaultsCardDetachSecretFromAgentMutation$variables = {
  input: DetachSecretFromAgentInput;
};
export type agentSecretDefaultsCardDetachSecretFromAgentMutation$data = {
  readonly DetachSecretFromAgent: {
    readonly id: string;
  };
};
export type agentSecretDefaultsCardDetachSecretFromAgentMutation = {
  response: agentSecretDefaultsCardDetachSecretFromAgentMutation$data;
  variables: agentSecretDefaultsCardDetachSecretFromAgentMutation$variables;
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
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "DetachSecretFromAgent",
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
    "name": "agentSecretDefaultsCardDetachSecretFromAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSecretDefaultsCardDetachSecretFromAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "692ee8957e2608eb5cb27462a101349a",
    "id": null,
    "metadata": {},
    "name": "agentSecretDefaultsCardDetachSecretFromAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSecretDefaultsCardDetachSecretFromAgentMutation(\n  $input: DetachSecretFromAgentInput!\n) {\n  DetachSecretFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "f8338306c4099decf0419ea3b676d493";

export default node;
