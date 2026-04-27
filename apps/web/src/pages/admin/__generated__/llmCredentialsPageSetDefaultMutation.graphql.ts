/**
 * @generated SignedSource<<d41d65de7be66364c3eef805cf655e60>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type SetDefaultPlatformModelProviderCredentialInput = {
  id: string;
};
export type llmCredentialsPageSetDefaultMutation$variables = {
  input: SetDefaultPlatformModelProviderCredentialInput;
};
export type llmCredentialsPageSetDefaultMutation$data = {
  readonly SetDefaultPlatformModelProviderCredential: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type llmCredentialsPageSetDefaultMutation = {
  response: llmCredentialsPageSetDefaultMutation$data;
  variables: llmCredentialsPageSetDefaultMutation$variables;
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
    "name": "SetDefaultPlatformModelProviderCredential",
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
    "name": "llmCredentialsPageSetDefaultMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialsPageSetDefaultMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "861ff4364acd3d0d828c513e48ec498a",
    "id": null,
    "metadata": {},
    "name": "llmCredentialsPageSetDefaultMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialsPageSetDefaultMutation(\n  $input: SetDefaultPlatformModelProviderCredentialInput!\n) {\n  SetDefaultPlatformModelProviderCredential(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "9c09f98d1f8e0b6bac7b52b780213449";

export default node;
