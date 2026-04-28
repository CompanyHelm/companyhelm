/**
 * @generated SignedSource<<5f1e89dc265707ea30cc681aaf571216>>
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
    "cacheID": "1494351157025ec6b0f803d819fc73b7",
    "id": null,
    "metadata": {},
    "name": "flowAddModelProviderCredentialMutation",
    "operationKind": "mutation",
    "text": "mutation flowAddModelProviderCredentialMutation(\n  $input: AddModelProviderCredentialInput!\n) {\n  AddModelProviderCredential(input: $input) {\n    id\n    name\n    modelProvider\n    baseUrl\n  }\n}\n"
  }
};
})();

(node as any).hash = "5cf07b0013d825572f31e2a5b7d54836";

export default node;
