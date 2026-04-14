/**
 * @generated SignedSource<<d9481d6378a3f768420f4fb5ed293057>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateSecretGroupInput = {
  name: string;
};
export type secretGroupsPageCreateSecretGroupMutation$variables = {
  input: CreateSecretGroupInput;
};
export type secretGroupsPageCreateSecretGroupMutation$data = {
  readonly CreateSecretGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupsPageCreateSecretGroupMutation = {
  response: secretGroupsPageCreateSecretGroupMutation$data;
  variables: secretGroupsPageCreateSecretGroupMutation$variables;
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
    "name": "CreateSecretGroup",
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
    "name": "secretGroupsPageCreateSecretGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupsPageCreateSecretGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7cefa56dcce5b1590c3c45b1cd3f2d0b",
    "id": null,
    "metadata": {},
    "name": "secretGroupsPageCreateSecretGroupMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupsPageCreateSecretGroupMutation(\n  $input: CreateSecretGroupInput!\n) {\n  CreateSecretGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "93d4516ff80fbe55a2580a2592e8e3fb";

export default node;
