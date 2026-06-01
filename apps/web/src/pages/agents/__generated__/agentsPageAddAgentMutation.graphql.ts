/**
 * @generated SignedSource<<e16dab8180c4b13e487d1538f7ae61fb>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddAgentInput = {
  autoCompactPercent?: number | null | undefined;
  defaultComputeProviderDefinitionId: string;
  defaultEnvironmentTemplateId: string;
  llmModelId: string;
  mcpServerIds?: ReadonlyArray<string> | null | undefined;
  modelOptions?: any | null | undefined;
  name: string;
  reasoningLevel?: string | null | undefined;
  secretGroupIds?: ReadonlyArray<string> | null | undefined;
  secretIds?: ReadonlyArray<string> | null | undefined;
  skillGroupIds?: ReadonlyArray<string> | null | undefined;
  skillIds?: ReadonlyArray<string> | null | undefined;
  systemPrompt?: string | null | undefined;
  title?: string | null | undefined;
};
export type agentsPageAddAgentMutation$variables = {
  input: AddAgentInput;
};
export type agentsPageAddAgentMutation$data = {
  readonly AddAgent: {
    readonly createdAt: string;
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelOptions: any;
    readonly modelProvider: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
    readonly systemPrompt: string | null | undefined;
    readonly title: string | null | undefined;
    readonly updatedAt: string;
  };
};
export type agentsPageAddAgentMutation = {
  response: agentsPageAddAgentMutation$data;
  variables: agentsPageAddAgentMutation$variables;
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
    "name": "AddAgent",
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
        "name": "title",
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
        "name": "reasoningLevel",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "modelOptions",
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
    "name": "agentsPageAddAgentMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "agentsPageAddAgentMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "25a635f675468de896edf8cd22c7d69d",
    "id": null,
    "metadata": {},
    "name": "agentsPageAddAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentsPageAddAgentMutation(\n  $input: AddAgentInput!\n) {\n  AddAgent(input: $input) {\n    id\n    name\n    title\n    modelProvider\n    modelName\n    reasoningLevel\n    modelOptions\n    systemPrompt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "b4543e526faab40d82a633ff577d41ef";

export default node;
