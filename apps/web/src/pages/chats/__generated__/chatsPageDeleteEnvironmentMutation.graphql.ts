/**
 * @generated SignedSource<<43eda963069c8c35e3518a7f17522160>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteEnvironmentInput = {
  force?: boolean | null | undefined;
  id: string;
};
export type chatsPageDeleteEnvironmentMutation$variables = {
  input: DeleteEnvironmentInput;
};
export type chatsPageDeleteEnvironmentMutation$data = {
  readonly DeleteEnvironment: {
    readonly id: string;
  };
};
export type chatsPageDeleteEnvironmentMutation = {
  response: chatsPageDeleteEnvironmentMutation$data;
  variables: chatsPageDeleteEnvironmentMutation$variables;
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
    "name": "DeleteEnvironment",
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
    "name": "chatsPageDeleteEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDeleteEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "49bd5da6299f9e262a25537e37a9c2ae",
    "id": null,
    "metadata": {},
    "name": "chatsPageDeleteEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDeleteEnvironmentMutation(\n  $input: DeleteEnvironmentInput!\n) {\n  DeleteEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "496951d78d7e023ee1f8baa7c8febdf4";

export default node;
