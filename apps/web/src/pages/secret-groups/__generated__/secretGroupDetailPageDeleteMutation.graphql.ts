/**
 * @generated SignedSource<<48e934ee909f64fd633625b122815371>>
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
export type secretGroupDetailPageDeleteMutation$variables = {
  input: DeleteSecretGroupInput;
};
export type secretGroupDetailPageDeleteMutation$data = {
  readonly DeleteSecretGroup: {
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupDetailPageDeleteMutation = {
  response: secretGroupDetailPageDeleteMutation$data;
  variables: secretGroupDetailPageDeleteMutation$variables;
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
    "name": "secretGroupDetailPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e3c40b458ce027080048f0e0d47aedbb",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupDetailPageDeleteMutation(\n  $input: DeleteSecretGroupInput!\n) {\n  DeleteSecretGroup(input: $input) {\n    id\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "1eb32a0f1093405c7e6136603d04f26f";

export default node;
