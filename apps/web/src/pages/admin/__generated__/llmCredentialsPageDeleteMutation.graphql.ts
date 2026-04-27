/**
 * @generated SignedSource<<6582aff02b559406ac22b499a1adaf6d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type DeletePlatformModelProviderCredentialInput = {
  id: string;
};
export type llmCredentialsPageDeleteMutation$variables = {
  input: DeletePlatformModelProviderCredentialInput;
};
export type llmCredentialsPageDeleteMutation$data = {
  readonly DeletePlatformModelProviderCredential: {
    readonly id: string;
  };
};
export type llmCredentialsPageDeleteMutation = {
  response: llmCredentialsPageDeleteMutation$data;
  variables: llmCredentialsPageDeleteMutation$variables;
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
    "name": "DeletePlatformModelProviderCredential",
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
    "name": "llmCredentialsPageDeleteMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialsPageDeleteMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7dd620315df289b2a995f7b03aa9d611",
    "id": null,
    "metadata": {},
    "name": "llmCredentialsPageDeleteMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialsPageDeleteMutation(\n  $input: DeletePlatformModelProviderCredentialInput!\n) {\n  DeletePlatformModelProviderCredential(input: $input) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "4f6b8658e78284584f754e8c38ecf71b";

export default node;
