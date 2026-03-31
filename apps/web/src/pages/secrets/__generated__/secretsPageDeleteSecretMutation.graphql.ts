/**
 * @generated SignedSource<<d10788ac5f446614fc108a65fa154d2a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeleteSecretInput = {
  id: string;
};
export type secretsPageDeleteSecretMutation$variables = {
  input: DeleteSecretInput;
};
export type secretsPageDeleteSecretMutation$data = {
  readonly DeleteSecret: {
    readonly id: string;
  };
};
export type secretsPageDeleteSecretMutation = {
  response: secretsPageDeleteSecretMutation$data;
  variables: secretsPageDeleteSecretMutation$variables;
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
    "concreteType": "Secret",
    "kind": "LinkedField",
    "name": "DeleteSecret",
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
    "name": "secretsPageDeleteSecretMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretsPageDeleteSecretMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "56945dc0328e518e34fc9ae97467ee77",
    "id": null,
    "metadata": {},
    "name": "secretsPageDeleteSecretMutation",
    "operationKind": "mutation",
    "text": "mutation secretsPageDeleteSecretMutation(\n  $input: DeleteSecretInput!\n) {\n  DeleteSecret(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "f5a7b7ba8bc7ca9e1abe09ba0faf3c82";

export default node;
