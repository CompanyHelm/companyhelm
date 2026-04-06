/**
 * @generated SignedSource<<92a0cb12406ed27e79562616f1aae156>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddComputeProviderDefinitionInput = {
  daytona?: AddDaytonaComputeProviderDefinitionInput | null | undefined;
  description?: string | null | undefined;
  e2b?: AddE2bComputeProviderDefinitionInput | null | undefined;
  isDefault?: boolean | null | undefined;
  name: string;
  provider: string;
};
export type AddDaytonaComputeProviderDefinitionInput = {
  apiKey: string;
  apiUrl?: string | null | undefined;
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
    readonly daytona: {
      readonly apiUrl: string;
    } | null | undefined;
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
        "concreteType": "DaytonaComputeProviderDefinition",
        "kind": "LinkedField",
        "name": "daytona",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "apiUrl",
            "storageKey": null
          }
        ],
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
    "cacheID": "f76d7ff8ee2a6a39d0faab7ee85b91dc",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageAddMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageAddMutation(\n  $input: AddComputeProviderDefinitionInput!\n) {\n  AddComputeProviderDefinition(input: $input) {\n    id\n    isDefault\n    name\n    provider\n    description\n    daytona {\n      apiUrl\n    }\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "13ca5e1e5cace98a3bb0f45dba50441f";

export default node;
