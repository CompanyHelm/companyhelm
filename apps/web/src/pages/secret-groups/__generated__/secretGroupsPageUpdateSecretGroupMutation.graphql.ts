/**
 * @generated SignedSource<<f14b1de3a51102f9d02835909c6c44a0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateSecretGroupInput = {
  id: string;
  name?: string | null | undefined;
};
export type secretGroupsPageUpdateSecretGroupMutation$variables = {
  input: UpdateSecretGroupInput;
};
export type secretGroupsPageUpdateSecretGroupMutation$data = {
  readonly UpdateSecretGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupsPageUpdateSecretGroupMutation = {
  response: secretGroupsPageUpdateSecretGroupMutation$data;
  variables: secretGroupsPageUpdateSecretGroupMutation$variables;
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
    "name": "UpdateSecretGroup",
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
    "name": "secretGroupsPageUpdateSecretGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupsPageUpdateSecretGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e247f0742db1884410968f4646e97b35",
    "id": null,
    "metadata": {},
    "name": "secretGroupsPageUpdateSecretGroupMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupsPageUpdateSecretGroupMutation(\n  $input: UpdateSecretGroupInput!\n) {\n  UpdateSecretGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "3e686a71304aec2de8119bde5e96d660";

export default node;
