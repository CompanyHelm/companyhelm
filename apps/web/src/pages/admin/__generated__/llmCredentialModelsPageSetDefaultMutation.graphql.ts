/**
 * @generated SignedSource<<d81f6a0a9cee238a05e54f1fe32ca311>>
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
export type llmCredentialModelsPageSetDefaultMutation$variables = {
  input: SetDefaultPlatformModelProviderCredentialModelInput;
};
export type llmCredentialModelsPageSetDefaultMutation$data = {
  readonly SetDefaultPlatformModelProviderCredentialModel: {
    readonly id: string;
    readonly isDefault: boolean;
  };
};
export type llmCredentialModelsPageSetDefaultMutation = {
  response: llmCredentialModelsPageSetDefaultMutation$data;
  variables: llmCredentialModelsPageSetDefaultMutation$variables;
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
    "name": "llmCredentialModelsPageSetDefaultMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialModelsPageSetDefaultMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "1087103218e83a172e2d8738e0d46a54",
    "id": null,
    "metadata": {},
    "name": "llmCredentialModelsPageSetDefaultMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialModelsPageSetDefaultMutation(\n  $input: SetDefaultPlatformModelProviderCredentialModelInput!\n) {\n  SetDefaultPlatformModelProviderCredentialModel(input: $input) {\n    id\n    isDefault\n  }\n}\n"
  }
};
})();

(node as any).hash = "cc3fd5cae7588fc1071309ed71f4aedc";

export default node;
