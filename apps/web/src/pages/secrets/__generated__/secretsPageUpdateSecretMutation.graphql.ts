/**
 * @generated SignedSource<<0ed53e161109eda9d48c4121e7fbd578>>
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
  value?: string | null | undefined;
};
export type secretsPageUpdateSecretMutation$variables = {
  input: UpdateSecretInput;
};
export type secretsPageUpdateSecretMutation$data = {
  readonly UpdateSecret: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type secretsPageUpdateSecretMutation = {
  response: secretsPageUpdateSecretMutation$data;
  variables: secretsPageUpdateSecretMutation$variables;
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
        "name": "description",
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
        "name": "createdAt",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "updatedAt",
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
    "name": "secretsPageUpdateSecretMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretsPageUpdateSecretMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "38f04dbed8899d459bd541c84113c437",
    "id": null,
    "metadata": {},
    "name": "secretsPageUpdateSecretMutation",
    "operationKind": "mutation",
    "text": "mutation secretsPageUpdateSecretMutation(\n  $input: UpdateSecretInput!\n) {\n  UpdateSecret(input: $input) {\n    id\n    name\n    description\n    envVarName\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "4ce3eaba65280e7038e625258d1fe005";

export default node;
