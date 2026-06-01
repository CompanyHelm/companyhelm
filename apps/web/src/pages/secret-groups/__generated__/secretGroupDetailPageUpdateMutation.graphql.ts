/**
 * @generated SignedSource<<c5caa9c69cd2146167e3acae9e02e1ca>>
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
export type secretGroupDetailPageUpdateMutation$variables = {
  input: UpdateSecretGroupInput;
};
export type secretGroupDetailPageUpdateMutation$data = {
  readonly UpdateSecretGroup: {
    readonly companyId: string;
    readonly id: string;
    readonly name: string;
  };
};
export type secretGroupDetailPageUpdateMutation = {
  response: secretGroupDetailPageUpdateMutation$data;
  variables: secretGroupDetailPageUpdateMutation$variables;
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
        "name": "companyId",
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
    "name": "secretGroupDetailPageUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "5299752917e6a7c84e3320400cc04362",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupDetailPageUpdateMutation(\n  $input: UpdateSecretGroupInput!\n) {\n  UpdateSecretGroup(input: $input) {\n    id\n    companyId\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "e86e558467047b4fb33a38586986723a";

export default node;
