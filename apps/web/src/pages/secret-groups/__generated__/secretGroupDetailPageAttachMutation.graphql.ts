/**
 * @generated SignedSource<<04e538b08d48cfe33786302a4960f9b0>>
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
export type secretGroupDetailPageAttachMutation$variables = {
  input: AttachSecretGroupToAgentInput;
};
export type secretGroupDetailPageAttachMutation$data = {
  readonly AttachSecretGroupToAgent: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupDetailPageAttachMutation = {
  response: secretGroupDetailPageAttachMutation$data;
  variables: secretGroupDetailPageAttachMutation$variables;
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
    "name": "secretGroupDetailPageAttachMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageAttachMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ec5710aefa8a07419affb931678167cd",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageAttachMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupDetailPageAttachMutation(\n  $input: AttachSecretGroupToAgentInput!\n) {\n  AttachSecretGroupToAgent(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "578d98da86035ff857724b64976ed723";

export default node;
