/**
 * @generated SignedSource<<a9fa51ef5e8bf06c3ef80aa8e46c44d5>>
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
export type flowAddModelProviderCredentialMutation$variables = {
  input: AddModelProviderCredentialInput;
};
export type flowAddModelProviderCredentialMutation$data = {
  readonly AddModelProviderCredential: {
    readonly baseUrl: string | null | undefined;
    readonly id: string;
    readonly isManaged: boolean;
    readonly modelProvider: string;
    readonly name: string;
  };
};
export type flowAddModelProviderCredentialMutation = {
  response: flowAddModelProviderCredentialMutation$data;
  variables: flowAddModelProviderCredentialMutation$variables;
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
        "name": "baseUrl",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "isManaged",
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
    "name": "flowAddModelProviderCredentialMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "flowAddModelProviderCredentialMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "dc5fbffc2222f7d9c36ce3b26e80b987",
    "id": null,
    "metadata": {},
    "name": "flowAddModelProviderCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation flowAddModelProviderCredentialMutation(\n  $input: AddModelProviderCredentialInput!\n) {\n  AddModelProviderCredential(input: $input) {\n    id\n    name\n    modelProvider\n    baseUrl\n    isManaged\n  }\n}\n"
  }
};
})();

(node as any).hash = "4651af23cb23f207136e926ad8fc98b1";

export default node;
