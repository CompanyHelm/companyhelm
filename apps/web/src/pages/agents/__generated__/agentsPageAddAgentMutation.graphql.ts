/**
 * @generated SignedSource<<bec0a0eed3eceae9eab51a107a0cce34>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type AddAgentInput = {
  defaultComputeProviderDefinitionId: string;
  defaultEnvironmentTemplateId: string;
  mcpServerIds?: ReadonlyArray<string> | null | undefined;
  modelProviderCredentialId: string;
  modelProviderCredentialModelId: string;
  name: string;
  reasoningLevel?: string | null | undefined;
  secretGroupIds?: ReadonlyArray<string> | null | undefined;
  secretIds?: ReadonlyArray<string> | null | undefined;
  skillGroupIds?: ReadonlyArray<string> | null | undefined;
  skillIds?: ReadonlyArray<string> | null | undefined;
  systemPrompt?: string | null | undefined;
};
export type agentsPageAddAgentMutation$variables = {
  input: AddAgentInput;
};
export type agentsPageAddAgentMutation$data = {
  readonly AddAgent: {
    readonly createdAt: string;
    readonly id: string;
    readonly modelName: string | null | undefined;
    readonly modelProvider: string | null | undefined;
    readonly name: string;
    readonly reasoningLevel: string | null | undefined;
    readonly systemPrompt: string | null | undefined;
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
    "cacheID": "6618d7b970978935cf8af65178ceab30",
    "id": null,
    "metadata": {},
    "name": "agentsPageAddAgentMutation",
    "operationKind": "mutation",
    "text": "mutation agentsPageAddAgentMutation(\n  $input: AddAgentInput!\n) {\n  AddAgent(input: $input) {\n    id\n    name\n    modelProvider\n    modelName\n    reasoningLevel\n    systemPrompt\n    createdAt\n    updatedAt\n  }\n}\n"
  }
};
})();

(node as any).hash = "670d5cbe3313e1ca051e84604a4053d1";

export default node;
