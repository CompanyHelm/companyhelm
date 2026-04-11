/**
 * @generated SignedSource<<d2d0bd2ffb1a343eb9bdd778bb91c402>>
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
export type chatsPageDataDeleteEnvironmentMutation$variables = {
  input: DeleteEnvironmentInput;
};
export type chatsPageDataDeleteEnvironmentMutation$data = {
  readonly DeleteEnvironment: {
    readonly id: string;
  };
};
export type chatsPageDataDeleteEnvironmentMutation = {
  response: chatsPageDataDeleteEnvironmentMutation$data;
  variables: chatsPageDataDeleteEnvironmentMutation$variables;
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
    "name": "chatsPageDataDeleteEnvironmentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "chatsPageDataDeleteEnvironmentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "8899c51bf2e18ecf72097282014848c6",
    "id": null,
    "metadata": {},
    "name": "chatsPageDataDeleteEnvironmentMutation",
    "operationKind": "mutation",
    "text": "mutation chatsPageDataDeleteEnvironmentMutation(\n  $input: DeleteEnvironmentInput!\n) {\n  DeleteEnvironment(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "a9c92cc2d9fe050e6ab06054714d2251";

export default node;
