/**
 * @generated SignedSource<<79e99ce5eb9e087d363475b0d226da45>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateSecretInput = {
  envVarName?: string | null | undefined;
  id: string;
  name?: string | null | undefined;
  secretGroupId?: string | null | undefined;
  value?: string | null | undefined;
};
export type secretGroupDetailPageUpdateSecretMutation$variables = {
  input: UpdateSecretInput;
};
export type secretGroupDetailPageUpdateSecretMutation$data = {
  readonly UpdateSecret: {
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
  };
};
export type secretGroupDetailPageUpdateSecretMutation = {
  response: secretGroupDetailPageUpdateSecretMutation$data;
  variables: secretGroupDetailPageUpdateSecretMutation$variables;
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
    "name": "UpdateSecret",
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "envVarName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "secretGroupId",
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
    "name": "secretGroupDetailPageUpdateSecretMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretGroupDetailPageUpdateSecretMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "945bf8a04e4601616cb62301cd6a168c",
    "id": null,
    "metadata": {},
    "name": "secretGroupDetailPageUpdateSecretMutation",
    "operationKind": "mutation",
    "text": "mutation secretGroupDetailPageUpdateSecretMutation(\n  $input: UpdateSecretInput!\n) {\n  UpdateSecret(input: $input) {\n    id\n    name\n    envVarName\n    secretGroupId\n  }\n}\n"
  }
};
})();

(node as any).hash = "74c2ea69cbaded68b8830332be6a65f3";

export default node;
