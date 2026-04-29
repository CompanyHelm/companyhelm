/**
 * @generated SignedSource<<f66e9e87deba89bfe031837653a52454>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateAgentInput = {
  defaultComputeProviderDefinitionId: string;
  defaultEnvironmentTemplateId: string;
  id: string;
  modelCredentialSource?: string | null | undefined;
  modelOptionId?: string | null | undefined;
  modelProviderCredentialId?: string | null | undefined;
  modelProviderCredentialModelId?: string | null | undefined;
  name: string;
  platformModelId?: string | null | undefined;
  platformModelProviderCredentialModelId?: string | null | undefined;
  reasoningLevel?: string | null | undefined;
  systemPrompt?: string | null | undefined;
};
export type agentDetailPageUpdateAgentMutation$variables = {
  input: UpdateAgentInput;
};
export type agentDetailPageUpdateAgentMutation$data = {
  readonly UpdateAgent: {
    readonly createdAt: string;
    readonly defaultComputeProvider: string | null | undefined;
    readonly defaultComputeProviderDefinitionId: string | null | undefined;
    readonly defaultComputeProviderDefinitionName: string | null | undefined;
    readonly defaultEnvironmentTemplateId: string;
    readonly environmentTemplate: {
      readonly computerUse: boolean;
      readonly cpuCount: number;
      readonly diskSpaceGb: number;
      readonly memoryGb: number;
      readonly name: string;
      readonly templateId: string;
    };
    readonly id: string;
    readonly modelCredentialKind: string;
    readonly modelCredentialSource: string;
    readonly modelName: string | null | undefined;
    readonly modelOptionId: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly name: string;
    readonly platformModelId: string | null | undefined;
    readonly reasoningLevel: string | null | undefined;
    readonly systemPrompt: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type agentDetailPageUpdateAgentMutation = {
  response: agentDetailPageUpdateAgentMutation$data;
  variables: agentDetailPageUpdateAgentMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "input"
  }
],
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "input",
        "variableName": "input"
      }
    ],
    "concreteType": "Agent",
    "kind": "LinkedField",
    "name": "UpdateAgent",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "id",
        "storageKey": null
      },
      (v1/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelCredentialSource",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelCredentialKind",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelOptionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "platformModelId",
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
        "name": "modelProviderCredentialModelId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultComputeProvider",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultComputeProviderDefinitionId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultComputeProviderDefinitionName",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "defaultEnvironmentTemplateId",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "AgentEnvironmentTemplate",
        "kind": "LinkedField",
        "name": "environmentTemplate",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "computerUse",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "cpuCount",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "diskSpaceGb",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "memoryGb",
            "storageKey": null
          },
          (v1/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "templateId",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "reasoningLevel",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "systemPrompt",
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
    "name": "agentDetailPageUpdateAgentMutation",
    "selections": (v2/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentDetailPageUpdateAgentMutation",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "45976764f5f22fd3518cf038033b505c",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageUpdateAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentDetailPageUpdateAgentMutation(\n  $input: UpdateAgentInput!\n) {\n  UpdateAgent(input: $input) {\n    id\n    name\n    modelCredentialSource\n    modelCredentialKind\n    modelOptionId\n    platformModelId\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    defaultComputeProvider\n    defaultComputeProviderDefinitionId\n    defaultComputeProviderDefinitionName\n    defaultEnvironmentTemplateId\n    environmentTemplate {\n      computerUse\n      cpuCount\n      diskSpaceGb\n      memoryGb\n      name\n      templateId\n    }\n    reasoningLevel\n    systemPrompt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "503a64986507307af88b811152e9cce1";

export default node;
