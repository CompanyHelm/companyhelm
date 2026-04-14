/**
 * @generated SignedSource<<96d5727962b19ceb0ef8f16a1977f3e6>>
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
export type secretsPageCreateSecretGroupMutation$variables = {
  input: CreateSecretGroupInput;
};
export type secretsPageCreateSecretGroupMutation$data = {
  readonly CreateSecretGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretsPageCreateSecretGroupMutation = {
  response: secretsPageCreateSecretGroupMutation$data;
  variables: secretsPageCreateSecretGroupMutation$variables;
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
    "name": "secretsPageCreateSecretGroupMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretsPageCreateSecretGroupMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "40c4becf8a7530e8a4dafe8580f17d9c",
    "id": null,
    "metadata": {},
    "name": "secretsPageCreateSecretGroupMutation",
    "operationKind": "mutation",
    "text": "mutation secretsPageCreateSecretGroupMutation(\n  $input: CreateSecretGroupInput!\n) {\n  CreateSecretGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "5b313e0932f1bbfed67e17d0d21206da";

export default node;
