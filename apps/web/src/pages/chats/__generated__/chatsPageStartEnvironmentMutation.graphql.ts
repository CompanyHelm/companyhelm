/**
 * @generated SignedSource<<1695be5e3ce1eabbb60b14afce04fbb1>>
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
export type chatsPageStartEnvironmentMutation$variables = {
  input: StartEnvironmentInput;
};
export type chatsPageStartEnvironmentMutation$data = {
  readonly StartEnvironment: {
    readonly id: string;
    readonly status: string;
  };
};
export type chatsPageStartEnvironmentMutation = {
  response: chatsPageStartEnvironmentMutation$data;
  variables: chatsPageStartEnvironmentMutation$variables;
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
    "name": "chatsPageStartEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageStartEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "bcfd3272d457dc7529ee3f2cedac9a49",
    "id": null,
    "metadata": {},
    "name": "chatsPageStartEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageStartEnvironmentMutation(\n  $input: StartEnvironmentInput!\n) {\n  StartEnvironment(input: $input) {\n    id\n    status\n  }\n}\n"
  }
};
})();

(node as any).hash = "9a003e46275407db62f018dea89b8358";

export default node;
