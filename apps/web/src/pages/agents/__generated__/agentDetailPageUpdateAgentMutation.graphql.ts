/**
 * @generated SignedSource<<860e04aa0f8efdd98968609066c2ab09>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type UpdateAgentInput = {
  defaultComputeProviderDefinitionId: string;
  id: string;
  modelProviderCredentialId: string;
  modelProviderCredentialModelId: string;
  name: string;
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
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly modelProviderCredentialId: string | null | undefined;
    readonly modelProviderCredentialModelId: string | null | undefined;
    readonly name: string;
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
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentDetailPageUpdateAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "79dc31e51ea253d3d539b7fad7fa577c",
    "id": null,
    "metadata": {},
    "name": "agentDetailPageUpdateAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentDetailPageUpdateAgentMutation(\n  $input: UpdateAgentInput!\n) {\n  UpdateAgent(input: $input) {\n    id\n    name\n    modelProviderCredentialId\n    modelProviderCredentialModelId\n    modelProvider\n    modelName\n    defaultComputeProvider\n    defaultComputeProviderDefinitionId\n    defaultComputeProviderDefinitionName\n    reasoningLevel\n    systemPrompt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "293fb6b1919af71ae7ae5fad9d71961e";

export default node;
