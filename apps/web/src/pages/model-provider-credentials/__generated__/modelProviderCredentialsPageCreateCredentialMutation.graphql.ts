/**
 * @generated SignedSource<<10eaa40e632fd1a83cbf65f6aa604c0c>>
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
  baseUrl?: string | null | undefined;
  isDefault?: boolean | null | undefined;
  modelProvider: string;
  name?: string | null | undefined;
  refreshToken?: string | null | undefined;
};
export type modelProviderCredentialsPageCreateCredentialMutation$variables = {
  input: AddModelProviderCredentialInput;
};
export type modelProviderCredentialsPageCreateCredentialMutation$data = {
  readonly AddModelProviderCredential: {
    readonly baseUrl: string | null | undefined;
    readonly createdAt: string;
    readonly defaultModelId: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly type: string;
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
        "name": "baseUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isDefault",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isManaged",
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
        "name": "type",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultModelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "errorMessage",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "refreshedAt",
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
    "cacheID": "5fce4e44e55f03f74231b2590310cf19",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageCreateCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageCreateCredentialMutation(\n  $input: AddModelProviderCredentialInput!\n) {\n  AddModelProviderCredential(input: $input) {\n    id\n    baseUrl\n    isDefault\n    isManaged\n    name\n    modelProvider\n    type\n    defaultModelId\n    status\n    errorMessage\n    refreshedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "c23c68f74562a20748c34b1bb84d8fe1";

export default node;
