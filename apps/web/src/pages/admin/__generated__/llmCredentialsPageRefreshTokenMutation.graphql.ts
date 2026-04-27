/**
 * @generated SignedSource<<6aec66197f9f7cc70e4ef9ead907439b>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshPlatformModelProviderCredentialTokenInput = {
  platformModelProviderCredentialId: string;
};
export type llmCredentialsPageRefreshTokenMutation$variables = {
  input: RefreshPlatformModelProviderCredentialTokenInput;
};
export type llmCredentialsPageRefreshTokenMutation$data = {
  readonly RefreshPlatformModelProviderCredentialToken: {
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type llmCredentialsPageRefreshTokenMutation = {
  response: llmCredentialsPageRefreshTokenMutation$data;
  variables: llmCredentialsPageRefreshTokenMutation$variables;
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
    "name": "RefreshPlatformModelProviderCredentialToken",
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
    "name": "llmCredentialsPageRefreshTokenMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialsPageRefreshTokenMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "3107d3b37d98a8ffddc695fb1a44d1c8",
    "id": null,
    "metadata": {},
    "name": "llmCredentialsPageRefreshTokenMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialsPageRefreshTokenMutation(\n  $input: RefreshPlatformModelProviderCredentialTokenInput!\n) {\n  RefreshPlatformModelProviderCredentialToken(input: $input) {\n    id\n    status\n    errorMessage\n    refreshedAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "3ad99a9b3f1aa0f96fa26a0a068be108";

export default node;
