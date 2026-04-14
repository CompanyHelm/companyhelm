/**
 * @generated SignedSource<<309d4727706eb8d1aa87c6f6f6f12297>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type CreateSecretInput = {
  description?: string | null | undefined;
  envVarName?: string | null | undefined;
  name: string;
  secretGroupId?: string | null | undefined;
  value: string;
};
export type secretsPageCreateSecretMutation$variables = {
  input: CreateSecretInput;
};
export type secretsPageCreateSecretMutation$data = {
  readonly CreateSecret: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly envVarName: string;
    readonly id: string;
    readonly name: string;
    readonly secretGroupId: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type secretsPageCreateSecretMutation = {
  response: secretsPageCreateSecretMutation$data;
  variables: secretsPageCreateSecretMutation$variables;
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
    "name": "CreateSecret",
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
        "name": "secretGroupId",
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
    "name": "secretsPageCreateSecretMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "secretsPageCreateSecretMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e48cb85c58f60d912a041c16b6523577",
    "id": null,
    "metadata": {},
    "name": "secretsPageCreateSecretMutation",
    "operationKind": "mutation",
    "text": "mutation secretsPageCreateSecretMutation(\n  $input: CreateSecretInput!\n) {\n  CreateSecret(input: $input) {\n    id\n    name\n    description\n    envVarName\n    secretGroupId\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "ae173c284c35e2a4209e8cee65149b21";

export default node;
