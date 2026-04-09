/**
 * @generated SignedSource<<5a53e51f3241a6e8ddc05b360d076fa6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateComputeProviderDefinitionInput = {
  description?: string | null | undefined;
  e2b?: UpdateE2bComputeProviderDefinitionInput | null | undefined;
  id: string;
  name: string;
};
export type UpdateE2bComputeProviderDefinitionInput = {
  apiKey?: string | null | undefined;
};
export type computeProviderDefinitionsPageUpdateMutation$variables = {
  input: UpdateComputeProviderDefinitionInput;
};
export type computeProviderDefinitionsPageUpdateMutation$data = {
  readonly UpdateComputeProviderDefinition: {
    readonly createdAt: string;
    readonly description: string | null | undefined;
    readonly e2b: {
      readonly hasApiKey: boolean;
    } | null | undefined;
    readonly id: string;
    readonly isDefault: boolean;
    readonly name: string;
    readonly provider: string;
    readonly updatedAt: string;
  };
};
export type computeProviderDefinitionsPageUpdateMutation = {
  response: computeProviderDefinitionsPageUpdateMutation$data;
  variables: computeProviderDefinitionsPageUpdateMutation$variables;
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
    "concreteType": "ComputeProviderDefinition",
    "kind": "LinkedField",
    "name": "UpdateComputeProviderDefinition",
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
        "name": "provider",
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
        "concreteType": "E2bComputeProviderDefinition",
        "kind": "LinkedField",
        "name": "e2b",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasApiKey",
            "storageKey": null
          }
        ],
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
    "name": "computeProviderDefinitionsPageUpdateMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "computeProviderDefinitionsPageUpdateMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "d0e003481d66174387483109d26fec13",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageUpdateMutation(\n  $input: UpdateComputeProviderDefinitionInput!\n) {\n  UpdateComputeProviderDefinition(input: $input) {\n    id\n    isDefault\n    name\n    provider\n    description\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b7792386804bdc3be466558335018fba";

export default node;
