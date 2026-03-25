/**
 * @generated SignedSource<<ae69deaf97840a2edff28430f27c6276>>
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
    readonly description: string;
    readonly id: string;
    readonly modelId: string;
    readonly modelProviderCredentialId: string;
    readonly name: string;
    readonly reasoningLevels: ReadonlyArray<string>;
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
        "name": "reasoningLevels",
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
    "cacheID": "d88159fa1d7dbdccbf7ef34ab98f7a23",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageRefreshModelsMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageRefreshModelsMutation(\n  $input: RefreshModelProviderCredentialModelsInput!\n) {\n  RefreshModelProviderCredentialModels(input: $input) {\n    id\n    modelProviderCredentialId\n    modelId\n    name\n    description\n    reasoningLevels\n  }\n}\n"
  }
};
})();

(node as any).hash = "18930b66e2ccef90a069f1d1d254a470";

export default node;
