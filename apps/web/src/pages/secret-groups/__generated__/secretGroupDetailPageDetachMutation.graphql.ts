/**
 * @generated SignedSource<<f3d83ffeac352a40908bb0ee6fae81ec>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DetachSecretGroupFromAgentInput = {
  agentId: string;
  secretGroupId: string;
};
export type secretGroupDetailPageDetachMutation$variables = {
  input: DetachSecretGroupFromAgentInput;
};
export type secretGroupDetailPageDetachMutation$data = {
  readonly DetachSecretGroupFromAgent: {
    readonly id: string;
  };
};
export type secretGroupDetailPageDetachMutation = {
  response: secretGroupDetailPageDetachMutation$data;
  variables: secretGroupDetailPageDetachMutation$variables;
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
    "name": "DetachSecretGroupFromAgent",
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
    "name": "secretGroupDetailPageDetachMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageDetachMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "612eb2eee259be5ab006a8cf0a990704",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageDetachMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupDetailPageDetachMutation(\n  $input: DetachSecretGroupFromAgentInput!\n) {\n  DetachSecretGroupFromAgent(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "9b358037b7eb700afe3c96a88c6246e9";

export default node;
