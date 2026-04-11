/**
 * @generated SignedSource<<09973ac71673139e98bf3522779b4c1d>>
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
export type modelProviderCredentialsPageRefreshCredentialTokenMutation$variables = {
  input: RefreshModelProviderCredentialTokenInput;
};
export type modelProviderCredentialsPageRefreshCredentialTokenMutation$data = {
  readonly RefreshModelProviderCredentialToken: {
    readonly errorMessage: string | null | undefined;
    readonly id: string;
    readonly refreshToken: string | null | undefined;
    readonly refreshedAt: string | null | undefined;
    readonly status: string;
    readonly updatedAt: string;
  };
};
export type modelProviderCredentialsPageRefreshCredentialTokenMutation = {
  response: modelProviderCredentialsPageRefreshCredentialTokenMutation$data;
  variables: modelProviderCredentialsPageRefreshCredentialTokenMutation$variables;
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
    "name": "modelProviderCredentialsPageRefreshCredentialTokenMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "modelProviderCredentialsPageRefreshCredentialTokenMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "f5c2c953aa16090bbf346e627c8fc01e",
    "id": null,
    "metadata": {},
    "name": "modelProviderCredentialsPageRefreshCredentialTokenMutation",
    "operationKind": "mutation",
    "text": "mutation modelProviderCredentialsPageRefreshCredentialTokenMutation(\n  $input: RefreshModelProviderCredentialTokenInput!\n) {\n  RefreshModelProviderCredentialToken(input: $input) {\n    id\n    status\n    errorMessage\n    refreshToken\n    refreshedAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "62454ba925874cb0dc582d310407793b";

export default node;
