/**
 * @generated SignedSource<<2d832ae0fc00e02b88deeb58c3efc32e>>
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
export type llmCredentialDetailPageRefreshMutation$variables = {
  input: RefreshPlatformModelProviderCredentialModelsInput;
};
export type llmCredentialDetailPageRefreshMutation$data = {
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
export type llmCredentialDetailPageRefreshMutation = {
  response: llmCredentialDetailPageRefreshMutation$data;
  variables: llmCredentialDetailPageRefreshMutation$variables;
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
    "name": "llmCredentialDetailPageRefreshMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "llmCredentialDetailPageRefreshMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "e2232490b02b03fd71e4c4ef70dc441e",
    "id": null,
    "metadata": {},
    "name": "llmCredentialDetailPageRefreshMutation",
    "operationKind": "mutation",
    "text": "mutation llmCredentialDetailPageRefreshMutation(\n  $input: RefreshPlatformModelProviderCredentialModelsInput!\n) {\n  RefreshPlatformModelProviderCredentialModels(input: $input) {\n    id\n    isDefault\n    modelId\n    name\n    description\n    reasoningSupported\n    reasoningLevels\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "f028f21e7cf5a2b54668cb842865f498";

export default node;
