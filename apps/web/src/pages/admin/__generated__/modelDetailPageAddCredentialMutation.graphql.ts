/**
 * @generated SignedSource<<e9bd59f888f4a1ba1d2216a699e54f0e>>
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
export type modelDetailPageAddCredentialMutation$variables = {
  input: AddPlatformModelProviderCredentialInput;
};
export type modelDetailPageAddCredentialMutation$data = {
  readonly AddPlatformModelProviderCredential: {
    readonly defaultModelId: string | null | undefined;
    readonly id: string;
  };
};
export type modelDetailPageAddCredentialMutation = {
  response: modelDetailPageAddCredentialMutation$data;
  variables: modelDetailPageAddCredentialMutation$variables;
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultModelId",
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
    "name": "modelDetailPageAddCredentialMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelDetailPageAddCredentialMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "b4d78154945e62c44a608a43185d3b1c",
    "id": null,
    "metadata": {},
    "name": "modelDetailPageAddCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation modelDetailPageAddCredentialMutation(\n  $input: AddPlatformModelProviderCredentialInput!\n) {\n  AddPlatformModelProviderCredential(input: $input) {\n    id\n    defaultModelId\n  }\n}\n"
  }
};
})();

(node as any).hash = "0610dc78f891346a5954ea65b53a80ce";

export default node;
