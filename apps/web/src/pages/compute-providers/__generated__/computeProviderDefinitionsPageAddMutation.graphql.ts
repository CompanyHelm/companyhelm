/**
 * @generated SignedSource<<703c9655e16984a77e2204e5bebc03c0>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddComputeProviderDefinitionInput = {
  description?: string | null | undefined;
  e2b?: AddE2bComputeProviderDefinitionInput | null | undefined;
  isDefault?: boolean | null | undefined;
  name: string;
};
export type AddE2bComputeProviderDefinitionInput = {
  apiKey: string;
};
export type computeProviderDefinitionsPageAddMutation$variables = {
  input: AddComputeProviderDefinitionInput;
};
export type computeProviderDefinitionsPageAddMutation$data = {
  readonly AddComputeProviderDefinition: {
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
export type computeProviderDefinitionsPageAddMutation = {
  response: computeProviderDefinitionsPageAddMutation$data;
  variables: computeProviderDefinitionsPageAddMutation$variables;
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
    "name": "AddComputeProviderDefinition",
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
    "name": "computeProviderDefinitionsPageAddMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "computeProviderDefinitionsPageAddMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "eec6105460f67ef8f75a53c1ca9af04b",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageAddMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageAddMutation(\n  $input: AddComputeProviderDefinitionInput!\n) {\n  AddComputeProviderDefinition(input: $input) {\n    id\n    isDefault\n    name\n    provider\n    description\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "942c5f8f67f1d53bc548155a6db39a01";

export default node;
