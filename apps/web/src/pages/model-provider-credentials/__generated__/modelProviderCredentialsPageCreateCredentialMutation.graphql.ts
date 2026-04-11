/**
 * @generated SignedSource<<a2119c0bf610ebe2ae2d68ccb46e08e4>>
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
    readonly createdAt: string;
    readonly defaultModelId: string | null | undefined;
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
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
        "name": "isDefault",
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
    "cacheID": "d346c3d475cba18c8e7975b24aabdaa0",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageCreateCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageCreateCredentialMutation(\n  $input: AddModelProviderCredentialInput!\n) {\n  AddModelProviderCredential(input: $input) {\n    id\n    isDefault\n    name\n    modelProvider\n    type\n    defaultModelId\n    status\n    errorMessage\n    refreshedAt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "431e708874e31b6cbaf2efad287adfcb";

export default node;
