/**
 * @generated SignedSource<<afed079f3f25029eb9f1f35b10515f5e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateComputeProviderDefinitionInput = {
  daytona?: UpdateDaytonaComputeProviderDefinitionInput | null | undefined;
  description?: string | null | undefined;
  e2b?: UpdateE2bComputeProviderDefinitionInput | null | undefined;
  id: string;
  name: string;
};
export type UpdateDaytonaComputeProviderDefinitionInput = {
  apiKey?: string | null | undefined;
  apiUrl?: string | null | undefined;
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
    readonly daytona: {
      readonly apiUrl: string;
    } | null | undefined;
    readonly description: string | null | undefined;
    readonly e2b: {
      readonly hasApiKey: boolean;
    } | null | undefined;
    readonly id: string;
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
    "cacheID": "1fff6d3f303eab8b4ee1d0c068c2fcae",
    "id": null,
    "metadata": {},
    "name": "computeProviderDefinitionsPageUpdateMutation",
    "operationKind": "mutation",
    "text": "mutation computeProviderDefinitionsPageUpdateMutation(\n  $input: UpdateComputeProviderDefinitionInput!\n) {\n  UpdateComputeProviderDefinition(input: $input) {\n    id\n    name\n    provider\n    description\n    daytona {\n      apiUrl\n    }\n    e2b {\n      hasApiKey\n    }\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "38945d62eba968f0b22d1d9ef75bf861";

export default node;
