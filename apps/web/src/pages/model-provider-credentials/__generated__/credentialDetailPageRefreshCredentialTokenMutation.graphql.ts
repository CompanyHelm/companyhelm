/**
 * @generated SignedSource<<9f2089bff5c37514400d3b03d7a95db5>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshModelProviderCredentialTokenInput = {
  modelProviderCredentialId: string;
};
export type credentialDetailPageRefreshCredentialTokenMutation$variables = {
  input: RefreshModelProviderCredentialTokenInput;
};
export type credentialDetailPageRefreshCredentialTokenMutation$data = {
  readonly RefreshModelProviderCredentialToken: {
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly refreshToken: string | null | undefined;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type credentialDetailPageRefreshCredentialTokenMutation = {
  response: credentialDetailPageRefreshCredentialTokenMutation$data;
  variables: credentialDetailPageRefreshCredentialTokenMutation$variables;
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
    "name": "RefreshModelProviderCredentialToken",
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
        "name": "refreshToken",
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
    "name": "credentialDetailPageRefreshCredentialTokenMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageRefreshCredentialTokenMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "041c1d8422a9e64aa497c48e4b45694e",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageRefreshCredentialTokenMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageRefreshCredentialTokenMutation(\n  $input: RefreshModelProviderCredentialTokenInput!\n) {\n  RefreshModelProviderCredentialToken(input: $input) {\n    id\n    status\n    errorMessage\n    refreshToken\n    refreshedAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "199bf480ed66101e371b5c716b2abd51";

export default node;
