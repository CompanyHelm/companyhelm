/**
 * @generated SignedSource<<c8440126a5749bc1b109e111f55d8a44>>
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
export type chatsPageDataStartEnvironmentMutation$variables = {
  input: StartEnvironmentInput;
};
export type chatsPageDataStartEnvironmentMutation$data = {
  readonly StartEnvironment: {
    readonly id: string;
  };
};
export type chatsPageDataStartEnvironmentMutation = {
  response: chatsPageDataStartEnvironmentMutation$data;
  variables: chatsPageDataStartEnvironmentMutation$variables;
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
    "name": "chatsPageDataStartEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataStartEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "53ed1a192fba9f050e62e09c0c1a377e",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataStartEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataStartEnvironmentMutation(\n  $input: StartEnvironmentInput!\n) {\n  StartEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "8f7b57a71ffe5c6394f08953c6d72636";

export default node;
