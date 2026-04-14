/**
 * @generated SignedSource<<65bd90f2fdaffd66a8089d8af66f69a1>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSecretGroupInput = {
  id: string;
};
export type secretGroupsPageDeleteSecretGroupMutation$variables = {
  input: DeleteSecretGroupInput;
};
export type secretGroupsPageDeleteSecretGroupMutation$data = {
  readonly DeleteSecretGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupsPageDeleteSecretGroupMutation = {
  response: secretGroupsPageDeleteSecretGroupMutation$data;
  variables: secretGroupsPageDeleteSecretGroupMutation$variables;
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
    "name": "DeleteSecretGroup",
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
    "name": "secretGroupsPageDeleteSecretGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupsPageDeleteSecretGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "17fab8f5c3c2060a7848082fa3798bdc",
    "id": null,
    "metadata": {},
    "name": "secretGroupsPageDeleteSecretGroupMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupsPageDeleteSecretGroupMutation(\n  $input: DeleteSecretGroupInput!\n) {\n  DeleteSecretGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "21112a5aba6b0f43476e50f68693046d";

export default node;
