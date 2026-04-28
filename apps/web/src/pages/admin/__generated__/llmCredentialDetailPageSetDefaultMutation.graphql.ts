/**
 * @generated SignedSource<<ae9dcb6261c2ab35d852ae9d0173e194>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultPlatformModelProviderCredentialModelInput = {
  id: string;
};
export type llmCredentialDetailPageSetDefaultMutation$variables = {
  input: SetDefaultPlatformModelProviderCredentialModelInput;
};
export type llmCredentialDetailPageSetDefaultMutation$data = {
  readonly SetDefaultPlatformModelProviderCredentialModel: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type llmCredentialDetailPageSetDefaultMutation = {
  response: llmCredentialDetailPageSetDefaultMutation$data;
  variables: llmCredentialDetailPageSetDefaultMutation$variables;
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
    "concreteType": "PlatformModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "SetDefaultPlatformModelProviderCredentialModel",
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
    "name": "llmCredentialDetailPageSetDefaultMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialDetailPageSetDefaultMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "bceb9c90fad37f88597bc38a96e1d8d7",
    "id": null,
    "metadata": {},
    "name": "llmCredentialDetailPageSetDefaultMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialDetailPageSetDefaultMutation(\n  $input: SetDefaultPlatformModelProviderCredentialModelInput!\n) {\n  SetDefaultPlatformModelProviderCredentialModel(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "538c72e20bc8e76cd34de6fa027522e8";

export default node;
