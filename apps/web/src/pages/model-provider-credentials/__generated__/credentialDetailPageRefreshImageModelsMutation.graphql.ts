/**
 * @generated SignedSource<<6a90b48b4c5903a339ce9cec818107ca>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RefreshImageProviderCredentialModelsInput = {
  modelProviderCredentialId: string;
};
export type credentialDetailPageRefreshImageModelsMutation$variables = {
  input: RefreshImageProviderCredentialModelsInput;
};
export type credentialDetailPageRefreshImageModelsMutation$data = {
  readonly RefreshImageProviderCredentialModels: ReadonlyArray<{
    readonly description: string;
    readonly id: string;
    readonly isDefault: boolean;
    readonly modelId: string;
    readonly name: string;
    readonly outputMimeTypes: ReadonlyArray<string>;
    readonly supportedQualities: ReadonlyArray<string>;
    readonly supportedSizes: ReadonlyArray<string>;
    readonly supportsEditing: boolean;
    readonly supportsFlexibleSizes: boolean;
    readonly supportsTransparentBackground: boolean;
  }>;
};
export type credentialDetailPageRefreshImageModelsMutation = {
  response: credentialDetailPageRefreshImageModelsMutation$data;
  variables: credentialDetailPageRefreshImageModelsMutation$variables;
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
    "concreteType": "ImageProviderCredentialModel",
    "kind": "LinkedField",
    "name": "RefreshImageProviderCredentialModels",
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
        "name": "outputMimeTypes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "supportedQualities",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "supportedSizes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "supportsEditing",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "supportsFlexibleSizes",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "supportsTransparentBackground",
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
    "name": "credentialDetailPageRefreshImageModelsMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "credentialDetailPageRefreshImageModelsMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "c1402e5a5ac94bbbcec729100195a96f",
    "id": null,
    "metadata": {},
    "name": "credentialDetailPageRefreshImageModelsMutation",
    "operationKind": "mutation",
    "text": "mutation credentialDetailPageRefreshImageModelsMutation(\n  $input: RefreshImageProviderCredentialModelsInput!\n) {\n  RefreshImageProviderCredentialModels(input: $input) {\n    id\n    isDefault\n    modelId\n    name\n    description\n    outputMimeTypes\n    supportedQualities\n    supportedSizes\n    supportsEditing\n    supportsFlexibleSizes\n    supportsTransparentBackground\n  }\n}\n"
  }
};
})();

(node as any).hash = "7902f5e168950904b2091ae3fb07d733";

export default node;
