/**
 * @generated SignedSource<<3045f7869f48147801ee42527a34bbe3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddPlatformModelProviderCredentialInput = {
  accessToken?: string | null | undefined;
  accessTokenExpiresAtMilliseconds?: string | null | undefined;
  apiKey?: string | null | undefined;
  baseUrl?: string | null | undefined;
  isDefault?: boolean | null | undefined;
  modelProvider: string;
  name?: string | null | undefined;
  refreshToken?: string | null | undefined;
};
export type llmCredentialsPageAddMutation$variables = {
  input: AddPlatformModelProviderCredentialInput;
};
export type llmCredentialsPageAddMutation$data = {
  readonly AddPlatformModelProviderCredential: {
    readonly id: string;
  };
};
export type llmCredentialsPageAddMutation = {
  response: llmCredentialsPageAddMutation$data;
  variables: llmCredentialsPageAddMutation$variables;
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
    "concreteType": "PlatformModelProviderCredential",
    "kind": "LinkedField",
    "name": "AddPlatformModelProviderCredential",
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
    "name": "llmCredentialsPageAddMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialsPageAddMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "a44cc0d7917834cb7b7d0beacfb1fdf8",
    "id": null,
    "metadata": {},
    "name": "llmCredentialsPageAddMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialsPageAddMutation(\n  $input: AddPlatformModelProviderCredentialInput!\n) {\n  AddPlatformModelProviderCredential(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "a89762de6351c808d9ec6d3462a56a24";

export default node;
