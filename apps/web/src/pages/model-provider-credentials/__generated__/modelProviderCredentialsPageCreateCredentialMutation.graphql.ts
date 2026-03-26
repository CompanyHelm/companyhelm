/**
 * @generated SignedSource<<55b24fe318792ba119efaa48f48e9912>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddModelProviderCredentialInput = {
  accessToken?: string | null | undefined;
  accessTokenExpiresAtMilliseconds?: string | null | undefined;
  apiKey?: string | null | undefined;
  modelProvider: string;
  name?: string | null | undefined;
  refreshToken?: string | null | undefined;
};
export type modelProviderCredentialsPageCreateCredentialMutation$variables = {
  input: AddModelProviderCredentialInput;
};
export type modelProviderCredentialsPageCreateCredentialMutation$data = {
  readonly AddModelProviderCredential: {
    readonly createdAt: string;
    readonly id: string;
    readonly modelProvider: string;
    readonly name: string;
    readonly updatedAt: string;
  };
};
export type modelProviderCredentialsPageCreateCredentialMutation = {
  response: modelProviderCredentialsPageCreateCredentialMutation$data;
  variables: modelProviderCredentialsPageCreateCredentialMutation$variables;
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
    "concreteType": "ModelProviderCredential",
    "kind": "LinkedField",
    "name": "AddModelProviderCredential",
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
        "name": "modelProvider",
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
    "name": "modelProviderCredentialsPageCreateCredentialMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelProviderCredentialsPageCreateCredentialMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "46b270c23e286b71b20ab2ddeb809f97",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageCreateCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageCreateCredentialMutation(\n  $input: AddModelProviderCredentialInput!\n) {\n  AddModelProviderCredential(input: $input) {\n    id\n    name\n    modelProvider\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "98fd7afb6575af93c9bcf672a791bb47";

export default node;
