/**
 * @generated SignedSource<<d330b792e4d011c61ce62cab7568e964>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshPlatformModelProviderCredentialModelsInput = {
  platformModelProviderCredentialId: string;
};
export type llmCredentialModelsPageRefreshMutation$variables = {
  input: RefreshPlatformModelProviderCredentialModelsInput;
};
export type llmCredentialModelsPageRefreshMutation$data = {
  readonly RefreshPlatformModelProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly modelId: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly reasoningSupported: boolean;
    readonly updatedAt: string;
  }>;
};
export type llmCredentialModelsPageRefreshMutation = {
  response: llmCredentialModelsPageRefreshMutation$data;
  variables: llmCredentialModelsPageRefreshMutation$variables;
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
    "name": "RefreshPlatformModelProviderCredentialModels",
    "plural": true,
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
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelId",
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
        "name": "description",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningSupported",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevels",
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
    "name": "llmCredentialModelsPageRefreshMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialModelsPageRefreshMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "61a8b82825a1850ee4fccc7f13030fb2",
    "id": null,
    "metadata": {},
    "name": "llmCredentialModelsPageRefreshMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialModelsPageRefreshMutation(\n  $input: RefreshPlatformModelProviderCredentialModelsInput!\n) {\n  RefreshPlatformModelProviderCredentialModels(input: $input) {\n    id\n    isDefault\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "843f82bce1945c94e3ccacb6eae33976";

export default node;
