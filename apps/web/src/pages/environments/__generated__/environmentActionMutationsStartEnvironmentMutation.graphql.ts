/**
 * @generated SignedSource<<1c183ea67b6b5a2421b0ace3e8c70da2>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StartEnvironmentInput = {
  id: string;
};
export type environmentActionMutationsStartEnvironmentMutation$variables = {
  input: StartEnvironmentInput;
};
export type environmentActionMutationsStartEnvironmentMutation$data = {
  readonly StartEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type environmentActionMutationsStartEnvironmentMutation = {
  response: environmentActionMutationsStartEnvironmentMutation$data;
  variables: environmentActionMutationsStartEnvironmentMutation$variables;
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
    "concreteType": "Environment",
    "kind": "LinkedField",
    "name": "StartEnvironment",
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
    "name": "environmentActionMutationsStartEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "environmentActionMutationsStartEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c03e4537c32b66a820468309a885d009",
    "id": null,
    "metadata": {},
    "name": "environmentActionMutationsStartEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation environmentActionMutationsStartEnvironmentMutation(\n  $input: StartEnvironmentInput!\n) {\n  StartEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "8bbe1096d8d53345d41a184aaa59dccb";

export default node;
