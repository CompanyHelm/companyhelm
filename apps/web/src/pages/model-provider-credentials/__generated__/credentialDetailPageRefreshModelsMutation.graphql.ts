/**
 * @generated SignedSource<<ce3f14e46bb15936483251d5a4a2c8db>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshModelProviderCredentialModelsInput = {
  modelProviderCredentialId: string;
};
export type credentialDetailPageRefreshModelsMutation$variables = {
  input: RefreshModelProviderCredentialModelsInput;
};
export type credentialDetailPageRefreshModelsMutation$data = {
  readonly RefreshModelProviderCredentialModels: ReadonlyArray<{
    readonly createdAt: string;
    readonly id: string;
    readonly modelProviderCredentialId: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
    readonly updatedAt: string;
  }>;
};
export type credentialDetailPageRefreshModelsMutation = {
  response: credentialDetailPageRefreshModelsMutation$data;
  variables: credentialDetailPageRefreshModelsMutation$variables;
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
    "concreteType": "ModelProviderCredentialModel",
    "kind": "LinkedField",
    "name": "RefreshModelProviderCredentialModels",
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
        "name": "modelProviderCredentialId",
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
        "name": "reasoningLevels",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "createdAt",
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
    "name": "credentialDetailPageRefreshModelsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageRefreshModelsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "ef92db9d4f6f872f58446def7488c6c9",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageRefreshModelsMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageRefreshModelsMutation(\n  $input: RefreshModelProviderCredentialModelsInput!\n) {\n  RefreshModelProviderCredentialModels(input: $input) {\n    id\n    modelProviderCredentialId\n    name\n    reasoningLevels\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "d49d8c41701fbe2b4d3405be6fbcb8f7";

export default node;
