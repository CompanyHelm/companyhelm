/**
 * @generated SignedSource<<1a5662c66cd45b0a494f188d3b4fb2ee>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AttachSecretGroupToAgentInput = {
  agentId: string;
  secretGroupId: string;
};
export type agentSecretDefaultsCardAttachSecretGroupToAgentMutation$variables = {
  input: AttachSecretGroupToAgentInput;
};
export type agentSecretDefaultsCardAttachSecretGroupToAgentMutation$data = {
  readonly AttachSecretGroupToAgent: {
    readonly id: string;
    readonly name: string;
  };
};
export type agentSecretDefaultsCardAttachSecretGroupToAgentMutation = {
  response: agentSecretDefaultsCardAttachSecretGroupToAgentMutation$data;
  variables: agentSecretDefaultsCardAttachSecretGroupToAgentMutation$variables;
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
    "concreteType": "SecretGroup",
    "kind": "LinkedField",
    "name": "AttachSecretGroupToAgent",
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
        "name": "name",
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
    "name": "agentSecretDefaultsCardAttachSecretGroupToAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentSecretDefaultsCardAttachSecretGroupToAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "78fdb703518c11eea0320c8794217543",
    "id": null,
    "metadata": {},
    "name": "agentSecretDefaultsCardAttachSecretGroupToAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentSecretDefaultsCardAttachSecretGroupToAgentMutation(\n  $input: AttachSecretGroupToAgentInput!\n) {\n  AttachSecretGroupToAgent(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "32a1da1aafedd3a69e79c9c02045644b";

export default node;
